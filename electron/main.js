const { app, BrowserWindow, Menu } = require('electron');
const path = require('path');
const fs = require('fs');

function crearVentana() {
  const ventana = new BrowserWindow({
    width: 1150,
    height: 920,
    icon: path.join(__dirname, '..', 'Imagenes', 'WoodTools.png'),
    autoHideMenuBar: true,
    webPreferences: {
      contextIsolation: true
    }
  });

  Menu.setApplicationMenu(null);
  ventana.loadFile(path.join(__dirname, '..', 'index.html'));

  // Modo de verificación interna: captura la ventana a un PNG y cierra.
  // Se activa con la variable de entorno CAPTURA_PRUEBA=<ruta del png>.
  // Con CAPTURA_CLICK=<id> hace clic en ese elemento antes de la captura.
  if (process.env.CAPTURA_PRUEBA) {
    ventana.webContents.once('did-finish-load', () => {
      setTimeout(async () => {
        try {
          if (process.env.CAPTURA_CLICK) {
            await ventana.webContents.executeJavaScript(
              `document.getElementById(${JSON.stringify(process.env.CAPTURA_CLICK)}).click()`
            );
            await new Promise(r => setTimeout(r, 400));
          }
          const imagen = await ventana.webContents.capturePage();
          fs.writeFileSync(process.env.CAPTURA_PRUEBA, imagen.toPNG());
        } finally {
          app.quit();
        }
      }, 1500);
    });
  }

  return ventana;
}

app.whenReady().then(crearVentana);

app.on('window-all-closed', () => {
  app.quit();
});
