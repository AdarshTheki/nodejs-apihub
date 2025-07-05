import connectDB from './db/index.js';
import server from './app.js';

const PORT = process.env.PORT || 8000;
const HOST = process.env.HOST || '0.0.0.0';

connectDB()
    .then(() => {
        server.listen(PORT, HOST, () => {
            console.log(`Running PORT >> http://localhost:${PORT}`);
        });
    })
    .catch((err) => console.log(`Server Failed On >> ${err.message}`));
