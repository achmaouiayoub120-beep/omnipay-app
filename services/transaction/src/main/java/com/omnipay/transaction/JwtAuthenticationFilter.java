package com.omnipay.transaction;

import java.io.IOException;
import java.util.List;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpHeaders;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.security.oauth2.jwt.JwtException;
import org.springframework.web.filter.OncePerRequestFilter;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;

/**
 * Extrait "Authorization: Bearer <jwt>", verifie signature, emetteur et expiration (JwtDecoder),
 * puis place l'utilisateur et ses roles dans le SecurityContext. Un jeton invalide laisse la requete
 * anonyme : les regles de SecurityConfig repondent alors 401 (ou 403 si le role manque).
 */
public class JwtAuthenticationFilter extends OncePerRequestFilter {

    private static final Logger LOG = LoggerFactory.getLogger(JwtAuthenticationFilter.class);
    private static final String BEARER = "Bearer ";

    private final JwtDecoder jwtDecoder;

    public JwtAuthenticationFilter(JwtDecoder jwtDecoder) {
        this.jwtDecoder = jwtDecoder;
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain chain)
            throws ServletException, IOException {
        String header = request.getHeader(HttpHeaders.AUTHORIZATION);
        if (header != null && header.startsWith(BEARER)) {
            try {
                Jwt jwt = jwtDecoder.decode(header.substring(BEARER.length()).trim());
                List<String> roles = jwt.getClaimAsStringList("roles");
                List<GrantedAuthority> authorities = (roles == null ? List.<String>of() : roles).stream()
                        .filter(role -> role.startsWith("ROLE_"))
                        .<GrantedAuthority>map(SimpleGrantedAuthority::new)
                        .toList();
                if (jwt.getSubject() != null && !jwt.getSubject().isBlank()) {
                    SecurityContextHolder.getContext().setAuthentication(
                            UsernamePasswordAuthenticationToken.authenticated(jwt.getSubject(), null, authorities));
                }
            } catch (JwtException e) {
                LOG.warn("JWT rejete : {}", e.getMessage());
            }
        }
        chain.doFilter(request, response);
    }
}
