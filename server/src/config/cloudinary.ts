import { v2 as cloudinary } from 'cloudinary';

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

export default cloudinary;

export const uploadImage = async (
  file: string | Buffer,
  folder: string = 'sistema-vales/orders'
): Promise<{ url: string; public_id: string }> => {
  try {
    const uploadOptions = {
      folder,
      resource_type: 'image' as const,
      transformation: [
        { width: 1920, height: 1080, crop: 'limit' },
        { quality: 'auto' },
        { format: 'auto' }
      ]
    };

    let result;
    if (Buffer.isBuffer(file)) {
      // Upload from buffer (memory storage)
      result = await new Promise((resolve, reject) => {
        cloudinary.uploader.upload_stream(
          uploadOptions,
          (error, result) => {
            if (error) reject(error);
            else resolve(result);
          }
        ).end(file);
      });
    } else {
      // Upload from base64 or URL
      result = await cloudinary.uploader.upload(file, uploadOptions);
    }

    return {
      url: (result as any).secure_url,
      public_id: (result as any).public_id
    };
  } catch (error) {
    console.error('Cloudinary upload error:', error);
    throw new Error('Failed to upload image');
  }
};

export const deleteImage = async (publicId: string): Promise<void> => {
  try {
    await cloudinary.uploader.destroy(publicId);
  } catch (error) {
    console.error('Cloudinary delete error:', error);
    throw new Error('Failed to delete image');
  }
};