# Contribuir a Acadelia

¡Gracias por tu interés! Este repo es un **MVP de portafolio**. Las contribuciones que más ayudan ahora son: **bugs**, **documentación**, **refactors** y **tests**.

## 🧭 Flujo general

1. **Revisa Issues** (o crea uno con las plantillas).
2. Crea una rama desde `main`: `feat/mi-feature` o `fix/bug-x`.
3. Sigue la guía rápida de dev (abajo).
4. Abre un PR con título claro y descripción (incluye capturas si aplica).

## ⚙️ Dev rápido (local)

```bash
npm i
# servicios base (opcional con Docker)
# docker compose up -d
npm run dev
```

**Requisitos**: Node 18+, PostgreSQL 14+, **Redis 6+**, **ClamAV**, **pdftocairo**, **FFmpeg/ffprobe**.
Crea `.env` a partir de `docs/.env.example`. **No subas secretos**.

## 🧹 Estilo y calidad

-   Código JavaScript: _vanilla_ + ESM; intenta mantener funciones pequeñas y puras.
-   Commits tipo: `feat: ...`, `fix: ...`, `docs: ...`, `refactor: ...`.
-   PR checklist:

    -   [ ] Sin secretos ni `.env`.
    -   [ ] README/Docs actualizados si corresponde.
    -   [ ] Manejo de errores (no fallar silenciosamente).
    -   [ ] Logs útiles (sin datos sensibles).
    -   [ ] Funciona en local (smoke test básico).

## 🐛 Bugs y 💡 Features

-   Usa las plantillas: **Bug report** / **Feature request** (Issues → New issue).
-   Si es un **tema de seguridad**, **no abras un issue público**: lee `SECURITY.md`.

## 📄 Licencia

MIT (uso **educativo/portafolio**, no comercial). Ver `LICENSE`.
