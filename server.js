const http = require('http');
const fs = require('fs');
const path = require('path');
const apiHandler = require('./api/ajax');

const PORT = process.env.PORT || 3000;

const server = http.createServer((req, res) => {
    const url = req.url.split('?')[0];

    // Serve API Endpoints
    if (url === '/api/ajax') {
        apiHandler(req, res);
        return;
    }

    // Static File Serving for local dev
    let relPath = url === '/' || url === '/khan-telecom-portal' ? 'index.html' : url.replace(/^\//, '');
    let filePath = path.resolve(process.cwd(), relPath);

    const ext = path.extname(filePath);
    const contentTypeMap = {
        '.html': 'text/html',
        '.css': 'text/css',
        '.js': 'application/javascript',
        '.json': 'application/json',
        '.png': 'image/png',
        '.jpg': 'image/jpeg'
    };

    const contentType = contentTypeMap[ext] || 'text/plain';

    fs.readFile(filePath, (err, content) => {
        if (err) {
            // Fallback to index.html if route not found
            let indexPath = path.resolve(process.cwd(), 'index.html');
            fs.readFile(indexPath, (err2, mainContent) => {
                if (err2) {
                    res.writeHead(404, { 'Content-Type': 'text/plain' });
                    res.end('File Not Found');
                } else {
                    res.writeHead(200, { 'Content-Type': 'text/html' });
                    res.end(mainContent, 'utf-8');
                }
            });
        } else {
            res.writeHead(200, { 'Content-Type': contentType });
            res.end(content, 'utf-8');
        }
    });
});

if (require.main === module) {
    server.listen(PORT, () => {
        console.log(`Khan Telecom Web Server running live at http://localhost:${PORT}`);
    });
}

module.exports = server;
