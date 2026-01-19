package main

import (
	"embed"
	"fmt"
	"log/slog"
	"os"
	"os/exec"
	"runtime"

	"github.com/wailsapp/wails/v2"
	"github.com/wailsapp/wails/v2/pkg/menu"
	"github.com/wailsapp/wails/v2/pkg/menu/keys"
	"github.com/wailsapp/wails/v2/pkg/options"
	"github.com/wailsapp/wails/v2/pkg/options/assetserver"
	wailsRuntime "github.com/wailsapp/wails/v2/pkg/runtime"
)

//go:embed all:frontend/dist
var assets embed.FS

// Version is set at build time via ldflags
var Version = "dev"

func main() {
	// Try to acquire instance lock (can be skipped with NOTEBEAM_SKIP_LOCK=1 for development)
	if os.Getenv("NOTEBEAM_SKIP_LOCK") != "1" {
		lock := NewInstanceLock()
		if err := lock.Acquire(); err != nil {
			slog.Error("failed to acquire lock", "error", err)
			showErrorDialog("NoteBeam is already running", "Another instance of NoteBeam is already running. Please use the existing window.")
			os.Exit(1)
		}
		defer lock.Release()
	} else {
		slog.Info("skipping instance lock (NOTEBEAM_SKIP_LOCK=1)")
	}

	// Create an instance of the app structure
	app := NewApp()

	// Create application menu
	appMenu := createApplicationMenu(app)

	// Create application with options
	err := wails.Run(&options.App{
		Title:  "NoteBeam",
		Width:  1024,
		Height: 768,
		AssetServer: &assetserver.Options{
			Assets: assets,
		},
		BackgroundColour: &options.RGBA{R: 27, G: 38, B: 54, A: 1},
		OnStartup:        app.startup,
		Menu:             appMenu,
		Bind: []interface{}{
			app,
		},
	})

	if err != nil {
		println("Error:", err.Error())
	}
}

// showErrorDialog shows a native error dialog
func showErrorDialog(title, message string) {
	switch runtime.GOOS {
	case "darwin":
		// Use osascript for macOS
		script := `display dialog "` + message + `" with title "` + title + `" buttons {"OK"} default button "OK" with icon stop`
		if err := exec.Command("osascript", "-e", script).Run(); err != nil {
			slog.Warn("failed to show error dialog", "error", err)
		}
	default:
		// For other platforms, just print to stderr
		println("Error:", title, "-", message)
	}
}

// createApplicationMenu creates the application menu
func createApplicationMenu(app *App) *menu.Menu {
	appMenu := menu.NewMenu()

	if runtime.GOOS == "darwin" {
		// macOS: App menu with About
		appMenu.Append(menu.AppMenu())

		// File menu
		fileMenu := appMenu.AddSubmenu("File")
		fileMenu.AddText("New Entry", keys.CmdOrCtrl("n"), func(_ *menu.CallbackData) {
			// Handled by frontend
		})
		fileMenu.AddSeparator()
		fileMenu.AddText("Close Window", keys.CmdOrCtrl("w"), func(_ *menu.CallbackData) {
			wailsRuntime.Quit(app.ctx)
		})

		// Edit menu with standard items
		appMenu.Append(menu.EditMenu())
	} else {
		// Windows/Linux: Help menu with About
		fileMenu := appMenu.AddSubmenu("File")
		fileMenu.AddText("New Entry", keys.CmdOrCtrl("n"), func(_ *menu.CallbackData) {
			// Handled by frontend
		})
		fileMenu.AddSeparator()
		fileMenu.AddText("Exit", keys.OptionOrAlt("F4"), func(_ *menu.CallbackData) {
			wailsRuntime.Quit(app.ctx)
		})

		// Edit menu
		appMenu.Append(menu.EditMenu())

		// Help menu
		helpMenu := appMenu.AddSubmenu("Help")
		helpMenu.AddText("About NoteBeam", nil, func(_ *menu.CallbackData) {
			app.ShowAboutDialog()
		})
	}

	return appMenu
}

// ShowAboutDialog shows the About dialog
func (a *App) ShowAboutDialog() {
	message := fmt.Sprintf("NoteBeam\n\nVersion: %s\n\nA simple note-taking app with TODO management.", Version)
	wailsRuntime.MessageDialog(a.ctx, wailsRuntime.MessageDialogOptions{
		Type:    wailsRuntime.InfoDialog,
		Title:   "About NoteBeam",
		Message: message,
	})
}
