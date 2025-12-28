import { app, BrowserWindow } from "electron";
import * as path from "path";

const isDevelopment =
	process.env.NODE_ENV === "development" ||
	process.env.DEBUG_PROD === "true" ||
	!app.isPackaged;

function createWindow(): void {
	console.log(path.join(__dirname, "/preload.js"));
	// Create the browser window
	const mainWindow = new BrowserWindow({
		width: 1200,
		height: 800,
		webPreferences: {
			nodeIntegration: false,
			contextIsolation: true,
			preload: path.join(__dirname, "/preload.js"),
			webSecurity: false, // Disable for development to avoid CORS issues
		},
		icon: path.join(__dirname, "@/assets/icon.png"),
		titleBarStyle: "default",
		show: false, // Don't show until ready-to-show
	});

	// Load the app with error handling
	const loadApp = async () => {
		try {
			if (isDevelopment) {
				console.log("Loading development server...");
				await mainWindow.loadURL("http://localhost:3000");
				mainWindow.webContents.openDevTools();
				console.log("Development server loaded successfully");
			} else {
				await mainWindow.loadFile(path.join(__dirname, "@/build/index.html"));
			}
		} catch (error) {
			console.error("Failed to load application:", error);
			if (isDevelopment) {
				// Retry loading after 2 seconds
				setTimeout(loadApp, 2000);
			}
		}
	};

	loadApp();

	// Show window when ready to prevent visual flash
	mainWindow.once("ready-to-show", () => {
		mainWindow.show();
		console.log("Electron window is ready and shown");
	});

	// Handle load failures
	mainWindow.webContents.on(
		"did-fail-load",
		(event, errorCode, errorDescription, validatedURL) => {
			console.error(
				"Failed to load URL:",
				validatedURL,
				"Error:",
				errorDescription,
			);
			if (isDevelopment) {
				setTimeout(loadApp, 2000);
			}
		},
	);

	// Handle window closed
	mainWindow.on("closed", () => {
		app.quit();
	});
}

// This method will be called when Electron has finished initialization
app.whenReady().then(() => {
	console.log("Electron app is ready");
	createWindow();
});

// Quit when all windows are closed, except on macOS
app.on("window-all-closed", () => {
	if (process.platform !== "darwin") {
		app.quit();
	}
});

app.on("activate", () => {
	// On macOS it's common to re-create a window in the app when the
	// dock icon is clicked and there are no other windows open
	if (BrowserWindow.getAllWindows().length === 0) {
		createWindow();
	}
});

// Security: Prevent navigation to external URLs (only in development)
if (isDevelopment) {
	app.on("web-contents-created", (event, contents) => {
		contents.on("will-navigate", (navigationEvent, navigationUrl) => {
			const parsedUrl = new URL(navigationUrl);

			if (parsedUrl.origin !== "http://localhost:3000") {
				console.log("Preventing navigation to:", navigationUrl);
				navigationEvent.preventDefault();
			}
		});
	});
}
