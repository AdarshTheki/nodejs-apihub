import mongoose from 'mongoose';

export default async function connectDB() {
    try {
        const { connection } = await mongoose.connect(process.env.MONGODB_URI);
        const { host, name } = connection;
        console.log(`Mongodb Connected On >> ${host} - ${name}`);
    } catch (error) {
        console.error(`Mongodb Failed On >> ${error.message}`);
        process.exit(1);
    }
}
