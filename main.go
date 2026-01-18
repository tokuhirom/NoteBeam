package main

import (
	"embed"
	"log/slog"
	"os"
	"os/exec"
	"runtime"

	"github.com/wailsapp/wails/v2"
	"github.com/wailsapp/wails/v2/pkg/options"
	"github.com/wailsapp/wails/v2/pkg/options/assetserver"
)

//go:embed all:frontend/dist
var assets embed.FS

func main() {
	// Try to acquire instance lock
	lock := NewInstanceLock()
	if err := lock.Acquire(); err != nil {
		slog.Error("failed to acquire lock", "error", err)
		showErrorDialog("NoteBeam is already running", "Another instance of NoteBeam is already running. Please use the existing window.")
		os.Exit(1)
	}
	defer lock.Release()

	// Create an instance of the app structure
	app := NewApp()

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
