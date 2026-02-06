require('dotenv').config();
const app = require('./app.js');

const PORT = process.env.PORT || 3000;
const HOST = process.env.HOST || 'localhost';

app.listen(PORT, HOST, () => {
    console.log(`Server is running locally at http://${HOST}:${PORT}`);
    console.log(`Documentation available at http://${HOST}:${PORT}/docs`);
});
