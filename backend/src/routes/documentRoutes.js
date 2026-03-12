const { Router } = require('express');
const upload = require('../middlewares/uploadMiddleware');
const { uploadDocument, getDocuments } = require('../controllers/documentController');

const router = Router();

router.post('/upload', upload.array('files', 20), uploadDocument);
router.get('/', getDocuments);

module.exports = router;
