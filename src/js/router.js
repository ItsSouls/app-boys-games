// Sistema de enrutamiento SPA para App Boys Games
export class Router {
  constructor() {
    this.routes = {};
    this.currentRoute = '';
    this.init();
  }

  // Registrar una ruta
  route(path, handler) {
    this.routes[path] = handler;
  }

  // Navegar a una ruta programáticamente
  navigate(path) {
    history.pushState(null, '', path);
    this.handleRoute(path);
  }

  // Navegar sin agregar al historial
  replace(path) {
    history.replaceState(null, '', path);
    this.handleRoute(path);
  }

  // Volver atrás
  back() {
    history.back();
  }

  // Manejar una ruta
  handleRoute(path) {
    this.currentRoute = path;
    console.log(`🛣️ Navegando a: ${path}`);

    // Buscar coincidencia exacta primero
    if (this.routes[path]) {
      this.routes[path]();
      return;
    }

    // Buscar rutas con parámetros (/games/:gameId)
    for (const route in this.routes) {
      const routeRegex = this.pathToRegex(route);
      const match = path.match(routeRegex);
      
      if (match) {
        const params = this.extractParams(route, match);
        this.routes[route](params);
        return;
      }
    }

    // Si no se encuentra la ruta, ir al home
    if (path !== '/') {
      console.log(`❓ Ruta no encontrada: ${path}, redirigiendo a home`);
      this.navigate('/');
    } else {
      console.log(`❌ Error: Ruta home '/' no encontrada en las rutas registradas`);
    }
  }

  // Convertir ruta con parámetros a regex
  pathToRegex(path) {
    const escapedPath = path
      .replace(/\//g, '\\/')
      .replace(/:([^\/]+)/g, '([^\/]+)');
    return new RegExp(`^${escapedPath}$`);
  }

  // Extraer parámetros de la ruta
  extractParams(route, match) {
    const paramNames = [];
    const paramRegex = /:([^\/]+)/g;
    let paramMatch;
    
    while ((paramMatch = paramRegex.exec(route)) !== null) {
      paramNames.push(paramMatch[1]);
    }

    const params = {};
    for (let i = 0; i < paramNames.length; i++) {
      params[paramNames[i]] = match[i + 1];
    }
    
    return params;
  }

  // Inicializar el router
  init() {
    // Manejar botón atrás/adelante del navegador
    window.addEventListener('popstate', () => {
      this.handleRoute(window.location.pathname);
    });

    // Manejar la ruta inicial
    const initialPath = window.location.pathname;
    this.handleRoute(initialPath);
  }

  // Obtener ruta actual
  getCurrentRoute() {
    return this.currentRoute;
  }
}

// Instancia global del router
export const router = new Router();
