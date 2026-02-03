import multer from 'multer'
import type { Request, Response, NextFunction } from 'express'

const storage = multer.memoryStorage()

const upload = multer({ 
  storage,
  limits: {
    fileSize: 800 * 1024, // 800KB
  },
  fileFilter: (req, file, cb) => {
    const allowedMimes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif']
    if (allowedMimes.includes(file.mimetype)) {
      cb(null, true)
    } else {
      cb(new Error('Invalid file type. Only JPG, PNG, and GIF are allowed'))
    }
  }
})

const uploadFile = (req: Request, res: Response, next: NextFunction) => {
  upload.single('file')(req, res, (err: any) => {
    if (err instanceof multer.MulterError) {
      let message = err.message;
      if (err.code === 'LIMIT_FILE_SIZE') {
        message = 'File too large. Maximum allowed size is 800KB.';
      }
      return res.status(400).json({
        statusCode: 400,
        message,
        success: false,
        errors: []
      });
    } else if (err) {
      return res.status(400).json({
        statusCode: 400,
        message: err.message || 'File upload failed',
        success: false,
        errors: []
      });
    }
    next();
  });
}

export default uploadFile