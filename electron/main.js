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
  //  - CAPTURA_CLICK=id1,id2,...  hace clic en esos elementos, en orden.
  //  - CAPTURA_TYPE=texto         tipea ese texto (teclado real) en el
  //    elemento con foco, para comprobar que se puede escribir.
  if (process.env.CAPTURA_PRUEBA) {
    ventana.webContents.once('did-finish-load', () => {
      setTimeout(async () => {
        try {
          if (process.env.CAPTURA_CLICK) {
            for (const id of process.env.CAPTURA_CLICK.split(',')) {
              await ventana.webContents.executeJavaScript(
                `document.getElementById(${JSON.stringify(id)}).click()`
              );
              await new Promise(r => setTimeout(r, 350));
            }
          }
          if (process.env.CAPTURA_TYPE) {
            for (const ch of process.env.CAPTURA_TYPE) {
              ventana.webContents.sendInputEvent({ type: 'char', keyCode: ch });
              await new Promise(r => setTimeout(r, 30));
            }
            await new Promise(r => setTimeout(r, 200));
          }
          const imagen = await ventana.webContents.capturePage();
          fs.writeFileSync(process.env.CAPTURA_PRUEBA, imagen.toPNG());
        } catch (e) {
          // No interrumpir el cierre si la captura falla
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
