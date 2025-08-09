import mongoose from 'mongoose';

export async function connectDB() {
  try {
    const res = await mongoose.connect(process.env.MONGODB_URI);
    console.log(`Database: ${res.connection.host} - ${res.connection.name}`);
  } catch (error) {
    console.error(`DB failed >> ${error.message}`);
    process.exit(1);
  }
}
