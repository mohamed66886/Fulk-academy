const { initializeApp, cert } = require("firebase-admin/app");

const projectId = "lomsaa-330fc";
const clientEmail = "firebase-adminsdk-fbsvc@lomsaa-330fc.iam.gserviceaccount.com";
const rawPrivateKey =
  "-----BEGIN PRIVATE KEY-----\\nMIIEvgIBADANBgkqhkiG9w0BAQEFAASCBKgwggSkAgEAAoIBAQDOTPCzEmBBkPy4\\nSfk6VO/t0eIrZOJU1V1Qavc4DpVgloQUbt13nkr0i/LPE6OUFqEjjOGtp7T09f+f\\nRhJhZieZEnlM7Fl6CmP/1tnsOljzPQ0a/wpTknaTAyAqxfdAxu60CMOmKkIxqaoM\\nY4hX7oJm7gan9PFXjgse6qb9Me0QhxJ4X2VvRtzH0kCnsDGdQkFrE54PjKCrmUSJ\\nB1tKCfd/fhRRF1IBjwtnvoNYygXt30QlNkAZemqR8PpWlVIyOJc6eFi5bmfV+rOX\\nfVM9jldz0BfwRKtF5x1Q067Sb3ubSvQsLRsGv6V6PxEa7xCIy96z9N+unRMLLL7D\\nKjlf1JzVAgMBAAECggEAJUjhjbOqAt+V1SbFbOXx8PzoT+htQWDIeyLB6Hc2Rx0c\\n5OZ+j0JkEJuEeCl3/Gk0mUy6ctynB0i4eMw8wS6pxHACzUTADR74oMHvY9LNxbRI\\nfJMQhjcnx/0eIKzjuWjatl4JIixsBza/PXr1ptK77adiO5O41Jae6ukE4ijWTBCR\\n/k1HkAjUdJBhhU5JK0anh3JoNZg9/vXQ1enBPek9ZTyJJ1uWizYqpIqzQRVFIiQf\\nriO4kurmEtr+hvnlKT0eZ+g+0LdvtlSAmvG1gLeniuhDbEQmk7sbMNLZ3arSvS1k\\n+UVLC/QiAajalS+aFkDWMVlEhd989yqlYDyaC5D5cQKBgQD7YXUZ3iOYWPgp/66v\\nY2gVJW7bV0VnIfyENAZUaF0nGZ8q50u0dtgOSczcue/jH2caWDu/4A3XiFlgWAKK\\nXg2RrKV76aQe7CDPbP03xOkx0aXl8pC42cWnc9t3NtKOn6KoQiArxOZHSrDL+lGB\\nTcFGx+FV8OZ15JYyFNGN8zB/zQKBgQDSF2rPueRk5g2qxNek4bo1/vKQxW5X0wmA\\n6dI4PjPTjdMaN/ijZIIwuawEUb7owTyGYwgfnsUdJwc3OMeqZjQr/i1+WeIzm5LT\\n6fS8AaYrA4xYbgl5f3iClYwUzJAyi7f8D1l4vBn4o8CfwGY+sP+KEyS2cgMbcgFy\\n0rji7Im5KQKBgQCB4nsk4Hg30VB4MtnJWW1/75V104PSo+bbUB4tIrdu6ngpLNUa\\n64T67Pri2VevXJxjKk/E9jlwscysUQ0O/UW5jSD8A15/c7YINuInHKD40sALLefE\\n+xB7UwuEb1kfxC/BDFmfA9+P2nG7Ex1l2A0TS1eMliodo/xO6B7WX18hyQKBgANT\\n158+pH1sn17LC1dTM+3TAeiFGABQGWBvU6MMaSm6n1NU+50q5Fz9M9pFqS5qkRjX\\nzLMjgp+5lIWtYowyXjUsK3BK4ChNGIA+vl+T7xvTTI/B/mhsOm5nC/bwXoBOcjWN\\n0K7227pybYSaOYRYrVN0hipVl/MBVUCKUd9WO8AxAoGBAJJR2MHLlbpvFdOWSD3C\\ntJ2bfKmzcF/iTy8n3XQrk0Lmn23q9BubEfeDHIBBMuYD4waCau50FjMxzIWcd0eZ\\nQJHV+PFFhmc6GwN9GYW8SSWlY1n2WhATcWr1ELwscT0+CTr3DUX6SS/Ua0XaHa8X\\nuqeRRQmpUv6ulIeI2qcuTrMx\\n-----END PRIVATE KEY-----\\n";

const privateKey = rawPrivateKey.replace(/^["']|["']$/g, "").replace(/\\n/g, "\n");

try {
  initializeApp({
    credential: cert({
      projectId,
      clientEmail,
      privateKey,
    }),
  });
  console.log("SUCCESS");
} catch (e) {
  console.error("FAIL:", e.message);
}
