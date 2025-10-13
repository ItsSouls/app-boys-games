# 🎮 App Boys Games - Aprende Español Jugando

Una aplicación web educativa e interactiva diseñada para que los niños aprendan español de manera divertida a través de juegos.

## 🌟 Características

### 🎯 Juegos Educativos
- **Números**: Aprende los números del 1 al 10
- **Colores**: Descubre los colores del arcoíris
- **Animales**: Conoce animales de la granja y la selva
- **Familia**: Aprende sobre los miembros de la familia
- **Partes del Cuerpo**: Descubre las partes del cuerpo humano
- **Ropa**: Aprende sobre diferentes prendas de vestir

### 🎨 Diseño Infantil
- Interfaz colorida y atractiva para niños
- Animaciones suaves y divertidas
- Iconos y emojis llamativos
- Diseño responsive para móviles y tablets

### 🏆 Sistema de Puntuación
- Puntos por respuestas correctas
- Retroalimentación inmediata
- Resultados y porcentajes al final
- Motivación con mensajes personalizados

### 🔊 Experiencia Interactiva
- Efectos visuales al interactuar
- Animaciones de respuestas correctas/incorrectas
- Navegación intuitiva
- Carga rápida y optimizada

## 🚀 Tecnologías Utilizadas

- **Frontend**: HTML5, CSS3, JavaScript ES6+
- **Build Tool**: Vite
- **Fonts**: Google Fonts (Fredoka)
- **Responsive Design**: CSS Grid y Flexbox
- **Animations**: CSS Animations y Transitions

## 📦 Instalación y Uso

### Prerrequisitos
- Node.js (versión 20 o superior)
- npm o yarn

### Instalación
```bash
# Clonar el repositorio
git clone <repository-url>
cd app-boys-games

# Instalar dependencias
npm install

# Ejecutar en modo desarrollo
npm run dev

# Construir para producción
npm run build

# Vista previa de la build de producción
npm run preview
```

## 🎮 Cómo Jugar

1. **Selecciona un juego** de la pantalla principal
2. **Lee la palabra en español** que aparece
3. **Selecciona la traducción correcta** en inglés
4. **Gana puntos** por cada respuesta correcta
5. **Ve tu puntuación final** al completar el juego

## 🎯 Objetivos Educativos

- Mejorar el vocabulario en español
- Aprender traducción español-inglés
- Desarrollar reconocimiento visual
- Fomentar el aprendizaje interactivo
- Crear asociaciones palabra-imagen

## 🛠️ Estructura del Proyecto

```
app-boys-games/
├── index.html           # Página principal
├── src/
│   ├── main.js         # Lógica principal de la aplicación
│   └── style.css       # Estilos CSS
├── public/             # Archivos estáticos
├── package.json        # Dependencias y scripts
└── README.md          # Documentación
```

## 🎨 Personalización

### Agregar Nuevos Juegos
Para agregar un nuevo juego, modifica el objeto `gameData` en `src/main.js`:

```javascript
newGame: {
  title: 'Nuevo Juego',
  icon: '🎯',
  description: 'Descripción del juego',
  words: [
    { spanish: 'palabra', english: 'word', emoji: '📝' },
    // más palabras...
  ]
}
```

### Modificar Estilos
Los estilos se encuentran en `src/style.css` y utilizan:
- Variables CSS para colores consistentes
- Grid layout responsive
- Animaciones CSS personalizadas
- Mobile-first approach

## 🌍 Futuras Mejoras

- [ ] Agregar sonidos y pronunciación
- [ ] Más categorías de juegos
- [ ] Sistema de progreso guardado
- [ ] Modo multijugador
- [ ] Niveles de dificultad
- [ ] Estadísticas detalladas
- [ ] Integración con Text-to-Speech
- [ ] Modo offline (PWA)

## 🤝 Contribuir

Las contribuciones son bienvenidas. Para contribuir:

1. Fork el proyecto
2. Crea una rama para tu feature (`git checkout -b feature/nueva-funcionalidad`)
3. Commit tus cambios (`git commit -am 'Agregar nueva funcionalidad'`)
4. Push a la rama (`git push origin feature/nueva-funcionalidad`)
5. Abre un Pull Request

## 📄 Licencia

Este proyecto está bajo la Licencia MIT. Ver el archivo `LICENSE` para más detalles.

## 👨‍💻 Autor

Desarrollado con ❤️ para hacer el aprendizaje del español más divertido para los niños.

---

¡Gracias por usar App Boys Games! 🎉
