// tests/pinata.test.js

const { uploadToPinata } = require('../utils/handleUploadIPFS');
const fetch = require('node-fetch');

jest.mock('node-fetch', () => jest.fn());

const mockBuffer = Buffer.from('fake content');

beforeEach(() => {
  jest.clearAllMocks();
  jest.spyOn(console, 'error').mockImplementation(() => {});
});

afterEach(() => {
  jest.restoreAllMocks();
});

describe('utils/handleUploadIPFS.js – uploadToPinata', () => {
  test('throws error when fileBuffer is invalid', async () => {
    await expect(uploadToPinata(null, 'test.txt')).rejects.toThrow('FileBuffer inválido');
    expect(console.error).toHaveBeenCalledWith("El fileBuffer no es válido:", null);
  });

  test('handles Pinata response error correctly', async () => {
    fetch.mockResolvedValue({
      ok: false,
      status: 400,
      statusText: 'Bad Request',
      text: jest.fn().mockResolvedValue('Invalid request'),
    });

    await expect(uploadToPinata(mockBuffer, 'test.txt')).rejects.toThrow('Error al subir el archivo: Bad Request');
    expect(console.error).toHaveBeenCalledWith("Error de respuesta de Pinata:", 'Invalid request');
  });

  test('handles general fetch errors correctly', async () => {
    const fetchError = new Error('Fetch error');
    fetch.mockRejectedValue(fetchError);

    await expect(uploadToPinata(mockBuffer, 'test.txt')).rejects.toThrow('Fetch error');
    expect(console.error).toHaveBeenCalledWith('Error al subir el archivo a Pinata:', fetchError);
  });

  test('successfully uploads file', async () => {
    const mockResponseData = { IpfsHash: 'Qm12345' };

    fetch.mockResolvedValue({
      ok: true,
      status: 200,
      statusText: 'OK',
      json: jest.fn().mockResolvedValue(mockResponseData),
    });

    const result = await uploadToPinata(mockBuffer, 'test.txt');

    expect(result).toEqual(mockResponseData);
  });
});
