package middleware

import (
	"context"
	"encoding/json"
	"fmt"
	"math/big"
	"crypto/rsa"
	"encoding/base64"
	"net/http"
	"os"
	"strings"
	"sync"
	"time"

	"crypto"
)

// Context keys for auth claims
type contextKey string

const (
	ContextKeyUserID contextKey = "auth_user_id"
	ContextKeyOrgID  contextKey = "auth_org_id"
	ContextKeyEmail  contextKey = "auth_email"
)

// JWKSResponse is the response from the WorkOS JWKS endpoint
type JWKSResponse struct {
	Keys []JWK `json:"keys"`
}

// JWK represents a JSON Web Key
type JWK struct {
	Kty string `json:"kty"`
	Kid string `json:"kid"`
	Use string `json:"use"`
	N   string `json:"n"`
	E   string `json:"e"`
	Alg string `json:"alg"`
}

// JWTHeader is a minimal JWT header
type JWTHeader struct {
	Alg string `json:"alg"`
	Kid string `json:"kid"`
	Typ string `json:"typ"`
}

// JWTClaims contains the claims we care about
type JWTClaims struct {
	Sub   string `json:"sub"`
	Email string `json:"email"`
	OrgID string `json:"org_id"`
	Exp   int64  `json:"exp"`
	Iat   int64  `json:"iat"`
	Iss   string `json:"iss"`
}

// AuthMiddleware validates WorkOS JWTs on incoming requests.
// In demo mode (DEMO_MODE=true), it passes requests through without validation.
type AuthMiddleware struct {
	clientID string
	demoMode bool
	jwksURL  string

	mu       sync.RWMutex
	keys     map[string]*rsa.PublicKey
	fetchedAt time.Time
}

// NewAuthMiddleware creates a new auth middleware.
// If clientID is empty or DEMO_MODE=true, requests pass through.
func NewAuthMiddleware(clientID string) *AuthMiddleware {
	demoMode := os.Getenv("DEMO_MODE") == "true" || clientID == ""
	jwksURL := fmt.Sprintf("https://api.workos.com/sso/jwks/%s", clientID)

	return &AuthMiddleware{
		clientID: clientID,
		demoMode: demoMode,
		jwksURL:  jwksURL,
		keys:     make(map[string]*rsa.PublicKey),
	}
}

// Handler returns an http.Handler that validates JWTs.
func (m *AuthMiddleware) Handler(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		// Skip auth in demo mode
		if m.demoMode {
			// Set demo context values
			ctx := context.WithValue(r.Context(), ContextKeyUserID, "demo-user")
			ctx = context.WithValue(ctx, ContextKeyOrgID, "demo-tenant")
			ctx = context.WithValue(ctx, ContextKeyEmail, "demo@betrace.dev")
			next.ServeHTTP(w, r.WithContext(ctx))
			return
		}

		// Skip auth for health/metrics endpoints
		if r.URL.Path == "/health" || r.URL.Path == "/metrics" {
			next.ServeHTTP(w, r)
			return
		}

		// Extract Bearer token
		authHeader := r.Header.Get("Authorization")
		if authHeader == "" || !strings.HasPrefix(authHeader, "Bearer ") {
			http.Error(w, `{"error":"missing or invalid Authorization header"}`, http.StatusUnauthorized)
			return
		}
		token := strings.TrimPrefix(authHeader, "Bearer ")

		// Validate JWT
		claims, err := m.validateJWT(token)
		if err != nil {
			http.Error(w, fmt.Sprintf(`{"error":"%s"}`, err.Error()), http.StatusUnauthorized)
			return
		}

		// Set claims in context
		ctx := context.WithValue(r.Context(), ContextKeyUserID, claims.Sub)
		ctx = context.WithValue(ctx, ContextKeyOrgID, claims.OrgID)
		ctx = context.WithValue(ctx, ContextKeyEmail, claims.Email)
		next.ServeHTTP(w, r.WithContext(ctx))
	})
}

func (m *AuthMiddleware) validateJWT(tokenStr string) (*JWTClaims, error) {
	parts := strings.Split(tokenStr, ".")
	if len(parts) != 3 {
		return nil, fmt.Errorf("invalid JWT format")
	}

	// Decode header
	headerBytes, err := base64URLDecode(parts[0])
	if err != nil {
		return nil, fmt.Errorf("invalid JWT header: %w", err)
	}
	var header JWTHeader
	if err := json.Unmarshal(headerBytes, &header); err != nil {
		return nil, fmt.Errorf("invalid JWT header: %w", err)
	}
	if header.Alg != "RS256" {
		return nil, fmt.Errorf("unsupported algorithm: %s", header.Alg)
	}

	// Decode claims
	claimsBytes, err := base64URLDecode(parts[1])
	if err != nil {
		return nil, fmt.Errorf("invalid JWT claims: %w", err)
	}
	var claims JWTClaims
	if err := json.Unmarshal(claimsBytes, &claims); err != nil {
		return nil, fmt.Errorf("invalid JWT claims: %w", err)
	}

	// Check expiration
	if claims.Exp > 0 && time.Now().Unix() > claims.Exp {
		return nil, fmt.Errorf("token expired")
	}

	// Verify signature
	key, err := m.getKey(header.Kid)
	if err != nil {
		return nil, fmt.Errorf("failed to get signing key: %w", err)
	}

	signingInput := parts[0] + "." + parts[1]
	signature, err := base64URLDecode(parts[2])
	if err != nil {
		return nil, fmt.Errorf("invalid JWT signature encoding: %w", err)
	}

	hash := crypto.SHA256.New()
	hash.Write([]byte(signingInput))
	hashed := hash.Sum(nil)

	if err := rsa.VerifyPKCS1v15(key, crypto.SHA256, hashed, signature); err != nil {
		return nil, fmt.Errorf("invalid JWT signature")
	}

	return &claims, nil
}

func (m *AuthMiddleware) getKey(kid string) (*rsa.PublicKey, error) {
	m.mu.RLock()
	key, ok := m.keys[kid]
	age := time.Since(m.fetchedAt)
	m.mu.RUnlock()

	if ok && age < 1*time.Hour {
		return key, nil
	}

	// Fetch JWKS
	return m.fetchKey(kid)
}

func (m *AuthMiddleware) fetchKey(kid string) (*rsa.PublicKey, error) {
	m.mu.Lock()
	defer m.mu.Unlock()

	// Double-check after acquiring write lock
	if key, ok := m.keys[kid]; ok && time.Since(m.fetchedAt) < 1*time.Hour {
		return key, nil
	}

	resp, err := http.Get(m.jwksURL)
	if err != nil {
		return nil, fmt.Errorf("failed to fetch JWKS: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("JWKS endpoint returned %d", resp.StatusCode)
	}

	var jwks JWKSResponse
	if err := json.NewDecoder(resp.Body).Decode(&jwks); err != nil {
		return nil, fmt.Errorf("failed to decode JWKS: %w", err)
	}

	// Parse all keys
	m.keys = make(map[string]*rsa.PublicKey)
	for _, jwk := range jwks.Keys {
		if jwk.Kty != "RSA" {
			continue
		}
		pubKey, err := jwkToRSAPublicKey(jwk)
		if err != nil {
			continue
		}
		m.keys[jwk.Kid] = pubKey
	}
	m.fetchedAt = time.Now()

	key, ok := m.keys[kid]
	if !ok {
		return nil, fmt.Errorf("key %s not found in JWKS", kid)
	}
	return key, nil
}

func jwkToRSAPublicKey(jwk JWK) (*rsa.PublicKey, error) {
	nBytes, err := base64URLDecode(jwk.N)
	if err != nil {
		return nil, err
	}
	eBytes, err := base64URLDecode(jwk.E)
	if err != nil {
		return nil, err
	}

	n := new(big.Int).SetBytes(nBytes)
	e := new(big.Int).SetBytes(eBytes)

	return &rsa.PublicKey{
		N: n,
		E: int(e.Int64()),
	}, nil
}

func base64URLDecode(s string) ([]byte, error) {
	// Add padding if needed
	switch len(s) % 4 {
	case 2:
		s += "=="
	case 3:
		s += "="
	}
	return base64.URLEncoding.DecodeString(s)
}

// Helper functions to extract auth info from context
func UserIDFromContext(ctx context.Context) string {
	if v, ok := ctx.Value(ContextKeyUserID).(string); ok {
		return v
	}
	return ""
}

func OrgIDFromContext(ctx context.Context) string {
	if v, ok := ctx.Value(ContextKeyOrgID).(string); ok {
		return v
	}
	return ""
}

func EmailFromContext(ctx context.Context) string {
	if v, ok := ctx.Value(ContextKeyEmail).(string); ok {
		return v
	}
	return ""
}
