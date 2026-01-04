# FRPC GUI

<div align="center">

**Cross-platform FRP Client GUI Manager**

A modern, user-friendly GUI application for managing FRP (Fast Reverse Proxy) clients across multiple platforms.

[![GitHub release](https://img.shields.io/github/v/release/hidumou/frpc-gui)](https://github.com/hidumou/frpc-gui/releases)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![Downloads](https://img.shields.io/github/downloads/hidumou/frpc-gui/total)](https://github.com/hidumou/frpc-gui/releases)
[![GitHub stars](https://img.shields.io/github/stars/hidumou/frpc-gui)](https://github.com/hidumou/frpc-gui/stargazers)
[![GitHub issues](https://img.shields.io/github/issues/hidumou/frpc-gui)](https://github.com/hidumou/frpc-gui/issues)

[English](./README.md) | [简体中文](./README_zh-CN.md)

</div>

## Features

- **Cross-platform Support**: Works on macOS, Windows, and Linux
- **Intuitive Dashboard**: Visual interface for managing all your FRP tunnels
- **Easy Configuration**: Import and manage FRP configurations with a clean UI
- **Real-time Logs**: Monitor your FRP client activity with built-in log viewer
- **Flexible Settings**: Customize FRP server settings and client options
- **TOML Support**: Native support for FRP TOML configuration files

## Screenshots

### Dashboard
Manage and monitor all your FRP tunnels in one place
![Dashboard](screenshots/dashboard.png)

### Settings
Configure FRP server connection and client settings
![Settings](screenshots/settings.png)

### Import Configuration
Easily import existing FRP configuration files
![Import](screenshots/import.png)

### Log Viewer
View real-time logs from your FRP client
![Log Viewer](screenshots/log.png)

## Installation

### Download Pre-built Binaries

You can download the latest release from the [Releases](https://github.com/hidumou/frpc-gui/releases) page.

- **macOS**: Download `.dmg` or `.zip` file
- **Windows**: Download `.exe` installer or `.zip` archive

### Build from Source

```bash
# Clone the repository
git clone https://github.com/hidumou/frpc-gui.git
cd frp-gui

# Install dependencies
pnpm install

# Build the application
pnpm electron:build
```

The built application will be in the `release` directory.

## Usage

1. **Launch the Application**: Open FRPC GUI after installation
2. **Configure Server**: Add your FRP server address and port in Settings
3. **Import Configuration**: Import your existing `frpc.toml` configuration file
4. **Start Tunnels**: Enable and manage your tunnels from the dashboard
5. **Monitor Logs**: View real-time logs to troubleshoot any issues

## Development

```bash
# Install dependencies
pnpm install

# Start development server
pnpm dev

# Build for production
pnpm build
```

## Requirements

- **Node.js**: >= 18.0.0
- **pnpm**: >= 8.0.0

## Technology Stack

- **Electron**: Cross-platform desktop application framework
- **React**: UI library
- **Vite**: Build tool and dev server
- **TypeScript**: Type-safe JavaScript
- **Tailwind CSS**: Utility-first CSS framework
- **Radix UI**: Accessible UI component library
- **i18next**: Internationalization framework

## License

MIT License - see [LICENSE](LICENSE) file for details

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## Support

If you encounter any issues or have questions, please [open an issue](https://github.com/hidumou/frpc-gui/issues) on GitHub.

## Acknowledgments

- [FRP](https://github.com/fatedier/frp) - Fast Reverse Proxy
- [Electron](https://www.electronjs.org/) - Cross-platform desktop framework
