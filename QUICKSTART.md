# 🚀 Guía Rápida de Inicio

## 1️⃣ Instalar Node.js

Si no lo tienes instalado:
- Descarga desde: https://nodejs.org (versión LTS recomendada)
- Verifica la instalación: `node --version`

## 2️⃣ Clonar o descargar el proyecto

Si lo tienes localmente, abre la terminal en la carpeta del proyecto.

## 3️⃣ Instalar dependencias

```bash
npm install
```

⏱️ Esto tomará 1-2 minutos la primera vez.

## 4️⃣ Iniciar el servidor de desarrollo

```bash
npm run dev
```

✅ Verás algo como: `Local: http://localhost:4321/`

Abre esa URL en tu navegador.

## 5️⃣ Editar contenido

### Para cambiar la homepage:
- `src/pages/index.astro` - Página principal
- `src/components/Hero.astro` - Sección hero
- `src/components/Solutions.astro` - Tarjetas de soluciones

### Para añadir un artículo al blog:
1. Crea un archivo en `src/pages/blog/posts/nombre-articulo.md`
2. Copia este template:

```markdown
---
layout: ../../layouts/BlogPost.astro
title: "Tu título aquí"
description: "Descripción breve"
author: "Kiko Mora"
date: "2026-02-06"
category: "Estrategia"
readTime: "5 min"
---

# Escribe tu contenido aquí

Usa **Markdown** normal.
```

3. Guarda y el artículo aparecerá automáticamente en `/blog`

## 6️⃣ Subir a GitHub (Primera vez)

```bash
# Inicializar Git
git init
git add .
git commit -m "Initial commit"

# Crear repo en GitHub y conectar
git remote add origin https://github.com/TU-USUARIO/aion-growth-studio.git
git push -u origin main
```

## 7️⃣ Desplegar en Vercel

1. Ve a https://vercel.com
2. Conecta tu cuenta de GitHub
3. "Import Project" → Selecciona tu repo
4. Click "Deploy"

🎉 ¡Listo! Tu sitio estará en vivo en 2 minutos.

### Dominio custom

En Vercel → Settings → Domains → Añade tu dominio

---

## 🆘 Problemas Comunes

**Error: "Cannot find module..."**
→ Ejecuta `npm install` de nuevo

**Puerto 4321 ocupado**
→ Astro usará automáticamente el siguiente puerto disponible

**Cambios no se reflejan**
→ Guarda el archivo y espera 1-2 segundos (hot reload automático)

**Build falla en Vercel**
→ Revisa que todas las imágenes y enlaces sean válidos

---

📚 **Más info**: Lee el README.md completo
