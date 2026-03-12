const { Router } = require('express');
const upload = require('../middlewares/uploadMiddleware');
const { uploadDocument, getDocuments } = require('../controllers/documentController');

const router = Router();

router.post('/upload', upload.single('file'), uploadDocument);
router.get('/', getDocuments);

module.exports = router;

