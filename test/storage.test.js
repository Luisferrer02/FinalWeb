// tests/storage.test.js
const request = require('supertest');
const app = require('../app');
const mongoose = require('mongoose');
const Storage = require('../models/nosql/storage');
const { uploadToPinata } = require('../utils/handleUploadIPFS');
const dbConnect = require('../config/mongo');

jest.mock('../utils/handleUploadIPFS', () => ({
  uploadToPinata: jest.fn().mockResolvedValue({ IpfsHash: 'fakehash' }),
}));

let itemId;

beforeAll(async () => {
  await dbConnect();

  // Espera activa a que la conexión esté establecida
  const waitForConnection = () => new Promise((resolve) => {
    const check = () => {
      if (mongoose.connection.readyState === 1) resolve();
      else setTimeout(check, 100);
    };
    check();
  });
  await waitForConnection();

  await Storage.deleteMany({});
});



afterAll(async () => {
  if (mongoose.connection.readyState === 1) {
    await Storage.deleteMany({});
    await mongoose.disconnect();
  }
});


describe('Storage Controller', () => {
  describe('getItems', () => {
    test('GET /api/storage → 200 con lista', async () => {
      await Storage.create({ originalName: 'file.txt', ipfs: 'url' });
      const res = await request(app).get('/api/storage');
      expect(res.statusCode).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
    });

    test('GET /api/storage → 500 en error DB', async () => {
      jest.spyOn(Storage, 'find').mockRejectedValueOnce(new Error('DB'));
      const res = await request(app).get('/api/storage');
      expect(res.statusCode).toBe(500);
      expect(res.body).toEqual({ error: 'ERROR_GET_ITEMS' });
      Storage.find.mockRestore();
    });
  });

  describe('getItem', () => {
    test('GET /api/storage/:id → 200 con el item', async () => {
      const doc = await Storage.create({ originalName: 'a.txt', ipfs: 'url' });
      const res = await request(app).get(`/api/storage/${doc._id}`);
      expect(res.statusCode).toBe(200);
      expect(res.body._id).toBe(doc._id.toString());
    });

    test('GET /api/storage/:id → 404 si no existe', async () => {
      const id = new mongoose.Types.ObjectId();
      const res = await request(app).get(`/api/storage/${id}`);
      expect(res.statusCode).toBe(404);
      expect(res.body).toEqual({ error: 'FILE_NOT_FOUND' });
    });

    test('GET /api/storage/:id → 500 en error DB', async () => {
      jest.spyOn(Storage, 'findById').mockRejectedValueOnce(new Error('DB'));
      const doc = await Storage.create({ originalName: 'z.txt', ipfs: 'url' });
      const res = await request(app).get(`/api/storage/${doc._id}`);
      expect(res.statusCode).toBe(500);
      expect(res.body).toEqual({ error: 'ERROR_GET_ITEM' });
      Storage.findById.mockRestore();
    });
  });

  describe('createItem', () => {
    test('POST /api/storage → 200 al subir', async () => {
      const res = await request(app)
        .post('/api/storage')
        .attach('image', Buffer.from('data'), { filename: 'test.png' });
      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty('_id');
      itemId = res.body._id;
    });

    test('POST /api/storage → 400 sin archivo', async () => {
      const res = await request(app).post('/api/storage');
      expect(res.statusCode).toBe(400);
      expect(res.body).toEqual({ error: 'NO_FILE_UPLOADED' });
    });

    test('POST /api/storage → 500 en fallo IPFS', async () => {
      uploadToPinata.mockRejectedValueOnce(new Error('IPFS'));
      const res = await request(app)
        .post('/api/storage')
        .attach('image', Buffer.from('x'), { filename: 'x.txt' });
      expect(res.statusCode).toBe(500);
      expect(res.body).toEqual({ error: 'ERROR_CREATE_ITEM' });
      uploadToPinata.mockResolvedValue({ IpfsHash: 'fakehash' });
    });
  });

  describe('updateImage', () => {
    test('PUT /api/storage/:id → 200 al actualizar', async () => {
      const res = await request(app)
        .put(`/api/storage/${itemId}`)
        .attach('image', Buffer.from('new'), { filename: 'new.png' });
      expect(res.statusCode).toBe(200);
      expect(res.body._id).toBe(itemId);
      expect(res.body.ipfs).toContain('fakehash');
    });

    test('PUT /api/storage/:id → 400 sin archivo', async () => {
      const res = await request(app).put(`/api/storage/${itemId}`);
      expect(res.statusCode).toBe(400);
      expect(res.body).toEqual({ error: 'NO_FILE_UPLOADED' });
    });

    test('PUT /api/storage/:id → 500 en fallo IPFS', async () => {
      uploadToPinata.mockRejectedValueOnce(new Error('IPFS'));
      const res = await request(app)
        .put(`/api/storage/${itemId}`)
        .attach('image', Buffer.from('img'), { filename: 'img.png' });
      expect(res.statusCode).toBe(500);
      expect(res.body).toEqual({ error: 'ERROR_UPDATE_IMAGE' });
      uploadToPinata.mockResolvedValue({ IpfsHash: 'fakehash' });
    });
  });

  describe('deleteItem', () => {
    test('DELETE /api/storage/:id → 200 al eliminar', async () => {
      const doc = await Storage.create({ originalName: 'del.txt', ipfs: 'url' });
      const res = await request(app).delete(`/api/storage/${doc._id}`);
      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty('message', 'Archivo eliminado correctamente');
    });

    test('DELETE /api/storage/:id → 404 si no existe', async () => {
      const id = new mongoose.Types.ObjectId();
      const res = await request(app).delete(`/api/storage/${id}`);
      expect(res.statusCode).toBe(404);
      expect(res.body).toEqual({ error: 'FILE_NOT_FOUND' });
    });

    test('DELETE /api/storage/:id → 500 en fallo DB', async () => {
      jest.spyOn(Storage, 'findById').mockRejectedValueOnce(new Error('DB'));
      const id = new mongoose.Types.ObjectId();
      const res = await request(app).delete(`/api/storage/${id}`);
      expect(res.statusCode).toBe(500);
      expect(res.body).toEqual({ error: 'ERROR_DELETE_FILE' });
      Storage.findById.mockRestore();
    });
  });
});
