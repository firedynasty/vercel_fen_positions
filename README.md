# vercel_fen_positions

A web application for building, saving, and organizing chess positions using FEN notation with cloud storage via Vercel Blob.

## Features

### 🎯 FEN Builder
- Interactive drag-and-drop chessboard
- Paste FEN notation or build positions visually
- Auto-generates FEN as you move pieces
- Copy/Paste FEN functionality

### 🔗 Lichess Integration
- Automatic generation of Lichess analysis URLs
- Separate URLs for "White to Move" and "Black to Move"
- One-click copy buttons

### 💾 Position Management
- Save positions with custom descriptions
- Click-to-copy FEN from table
- Click-to-load positions back to the board
- Delete individual positions
- Export all positions as CSV

### ☁️ Cloud Storage
- Save position sets to Vercel Blob Storage
- Access your positions from any device
- Access code protection for saves/deletes
- Automatic localStorage caching

### 🎨 UI Features
- Dark/Light mode toggle
- Sidebar for managing saved position sets
- Toast notifications
- Responsive design

## Getting Started

### Local Development

```bash
npm start
```

This starts a local server at `http://localhost:3000`

### Deploy to Vercel

```bash
vercel
```

### Set Access Code (Optional)

```bash
vercel env add ACCESS_CODE
# Enter your custom access code when prompted
```

## Usage

1. **Build a Position**
   - Paste FEN notation in the input field, OR
   - Drag and drop pieces on the interactive board

2. **Load Position**
   - Click "🏁 Load on Board" to display position
   - FEN auto-fills in the position saver input

3. **Save Position**
   - Enter a description in the name field
   - Click "+ Add Position" to add to your collection

4. **Export Positions**
   - Click "⬇ Download as CSV" to export all positions

5. **Save to Cloud**
   - Click "💾 Save Position Set" in the sidebar
   - Enter access code (default: `123`)
   - Your positions are now saved to Vercel Blob!

## Tech Stack

- **Frontend**: Vanilla JavaScript, HTML, CSS
- **Chess Board**: chessboard.js
- **Storage**: Vercel Blob Storage
- **Hosting**: Vercel

## File Structure

```
vercel_fen_positions/
├── index.html          # Main application
├── fen.html           # Original FEN builder (reference)
├── api/
│   └── files.js       # Vercel serverless function for blob storage
├── css/
│   └── chessboard-1.0.0.min.css
├── js/
│   └── chessboard-1.0.0.min.js
├── img/
│   └── chesspieces/   # Chess piece images
├── package.json
├── vercel.json
└── README.md
```

## API Endpoints

### GET `/api/files`
Fetch all saved position sets from Vercel Blob

### POST `/api/files`
Save a new position set
```json
{
  "filename": "my_positions.json",
  "content": "{...}",
  "accessCode": "123"
}
```

### DELETE `/api/files?filename=<name>`
Delete a position set (requires access code)

## Storage Format

Each position set is stored as JSON:
```json
{
  "name": "My Opening Repertoire",
  "timestamp": 1738512345678,
  "positions": [
    {
      "name": "Sicilian Defense",
      "fen": "rnbqkbnr/pp1ppppp/8/2p5/4P3/8/PPPP1PPP/RNBQKBNR w KQkq c6 0 2"
    },
    {
      "name": "French Defense",
      "fen": "rnbqkbnr/pppp1ppp/4p3/8/4P3/8/PPPP1PPP/RNBQKBNR w KQkq - 0 2"
    }
  ]
}
```

## Environment Variables

- `ACCESS_CODE` - Custom access code for save/delete operations (default: `123`)

## License

MIT
