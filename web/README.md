# FrameShift

FrameShift is a modern, focused video converter interface built with Next.js. It provides a clean workspace for selecting a video, choosing an output format, and setting the desired output quality.

## Features

- Drag-and-drop video upload area
- Browse Files button with video file validation
- Upload progress and ready status states
- Output format selection: MP4, AVI, MOV, and WEBM
- Output quality choices:
  - Highest — best visual quality and largest file size
  - Standard — balanced quality and file size
  - Low — fastest conversion and smallest file size
- Convert Video action becomes available after a file is selected
- Responsive layout for desktop and mobile screens
- Secure processing messaging in the interface

## Tech Stack

- Next.js 16
- React 19
- TypeScript
- Tailwind CSS 4
- shadcn/ui conventions
- lucide-react icons

## Getting Started

### Requirements

- Node.js 20 or newer
- pnpm

### Installation

```bash
pnpm install
```

### Run the development server

```bash
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Create a production build

```bash
pnpm build
pnpm start
```

## Project Structure

```text
app/
├── globals.css   # Global styles and design tokens
├── layout.tsx    # Root layout and metadata
└── page.tsx      # Video converter interface
```

## Current Scope

The current version implements the converter workflow UI and client-side file selection state. Actual video conversion requires a backend processing service or media-processing worker to be connected to the Convert Video action.

## Available Scripts

| Command | Description |
| --- | --- |
| `pnpm dev` | Start the development server |
| `pnpm build` | Build the application for production |
| `pnpm start` | Start the production server |

## License

This project is private and intended for internal or product development use.

## Deployment

The project is ready to deploy on Vercel. Connect the repository to Vercel or use the project’s Publish flow to create a deployment.

For installing or transferring the code, prefer the shadcn CLI workflow or GitHub repository integration.
