import { app } from './app.js';
import { connectDB } from './config/connectDB.js';

const PORT = process.env.PORT || 8000;
const HOST = process.env.HOST || '0.0.0.0';

connectDB()
  .then(() => {
    app.listen(PORT, HOST, () => {
      console.log(`Port URL: http://localhost:${PORT}`);
    });
  })
  .catch((err) => console.log(`Server Failed >> ${err.message}`));
