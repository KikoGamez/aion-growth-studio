# AIon Growth Studio

Sitio web corporativo con blog integrado para AIon Growth Studio - Inteligencia que convierte datos en crecimiento.

## 🚀 Stack Tecnológico

- **Framework**: Astro 4.0
- **Estilos**: Tailwind CSS
- **Blog**: Markdown files (sin CMS externo necesario)
- **Hosting**: Vercel (recomendado) o Netlify
- **Tipografías**: DM Sans + Outfit (Google Fonts)

## 📦 Instalación Local

```bash
# 1. Instalar dependencias
npm install

# 2. Iniciar servidor de desarrollo
npm run dev

# 3. El sitio estará disponible en http://localhost:4321
```

## 🏗️ Estructura del Proyecto

```
aion-growth-studio/
├── src/
│   ├── components/          # Componentes reutilizables
│   │   ├── Header.astro
│   │   ├── Hero.astro
│   │   ├── Solutions.astro
│   │   ├── DiagnosticForm.astro
│   │   └── Footer.astro
│   ├── layouts/             # Layouts de página
│   │   ├── Layout.astro     # Layout base
│   │   └── BlogPost.astro   # Layout para posts
│   ├── pages/               # Páginas del sitio
│   │   ├── index.astro      # Homepage
│   │   └── blog/
│   │       ├── index.astro  # Listado de posts
│   │       └── posts/       # Posts individuales (Markdown)
│   └── styles/
│       └── global.css       # Estilos globales
├── public/                  # Assets estáticos
├── astro.config.mjs         # Configuración de Astro
├── tailwind.config.mjs      # Configuración de Tailwind
└── package.json
```

## ✍️ Gestión del Blog

### Crear un nuevo artículo

1. Crea un nuevo archivo `.md` en `src/pages/blog/posts/`
2. Añade el frontmatter necesario:

```markdown
---
layout: ../../layouts/BlogPost.astro
title: "Título del artículo"
description: "Descripción breve"
author: "Kiko Mora"
date: "2026-02-06"
category: "Categoría"
readTime: "5 min lectura"
image: "URL de imagen destacada"
---

# Tu contenido aquí en Markdown
```

3. Guarda el archivo y automáticamente aparecerá en `/blog`

### Categorías disponibles

- Estrategia
- Tecnología
- Casos de Éxito
- Análisis
- Tendencias

## 🌐 Deploy en Vercel (Recomendado)

### Primera vez:

1. **Sube tu código a GitHub:**
```bash
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/tu-usuario/aion-growth-studio.git
git push -u origin main
```

2. **Conecta con Vercel:**
   - Ve a [vercel.com](https://vercel.com)
   - Haz click en "Add New Project"
   - Importa tu repositorio de GitHub
   - Vercel detectará automáticamente que es un proyecto Astro
   - Haz click en "Deploy"

3. **Configura tu dominio custom:**
   - En el dashboard de tu proyecto → Settings → Domains
   - Añade tu dominio (ej: aiongrowth.studio)
   - Sigue las instrucciones para configurar los DNS

### Deployments automáticos:

Una vez configurado, cada `git push` a `main` desplegará automáticamente a producción.

```bash
# Workflow diario
git add .
git commit -m "Nuevo artículo: título"
git push origin main
# ✅ Auto-deploy en Vercel
```

## 🔧 Comandos Disponibles

```bash
npm run dev       # Servidor de desarrollo
npm run build     # Build de producción
npm run preview   # Preview del build local
```

## 🎨 Personalización

### Colores

Edita `tailwind.config.mjs` para cambiar la paleta de colores:

```javascript
colors: {
  primary: { ... },   // Azul corporativo
  accent: { ... },    // Teal/Turquesa
}
```

### Tipografías

Las fuentes se cargan en `src/layouts/Layout.astro`. Para cambiarlas:

1. Busca las fuentes en [Google Fonts](https://fonts.google.com)
2. Reemplaza el `<link>` en el Layout
3. Actualiza `tailwind.config.mjs` con los nuevos nombres

## 📄 Páginas Futuras

El proyecto está preparado para añadir:

- `/plataforma` - Detalles de la plataforma
- `/soluciones` - Página de soluciones
- `/contacto` - Formulario de contacto
- `/diagnostico` - Herramienta de diagnóstico (zona privada)

Crea archivos `.astro` en `src/pages/` para cada una.

## 🔒 Zona Privada (Futuro)

Para añadir la herramienta de análisis privada:

1. Considera usar [Astro DB](https://docs.astro.build/en/guides/astro-db/) para datos
2. O integra con Supabase/Firebase para autenticación
3. Crea páginas en `src/pages/app/` para la zona privada

## 📞 Soporte

- **Documentación Astro**: https://docs.astro.build
- **Documentación Tailwind**: https://tailwindcss.com/docs
- **Deploy Vercel**: https://vercel.com/docs

---

Desarrollado con ❤️ para AIon Growth Studio
