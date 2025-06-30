// Azure Blob Storage モック

export const BlobServiceClient = jest.fn().mockImplementation(() => ({
  getContainerClient: jest.fn().mockReturnValue({
    uploadBlockBlob: jest.fn().mockResolvedValue({
      url: 'https://mock-storage.blob.core.windows.net/container/mock-file.txt'
    }),
    getBlockBlobClient: jest.fn().mockReturnValue({
      download: jest.fn().mockResolvedValue({
        readableStreamBody: 'mock file content'
      }),
      delete: jest.fn().mockResolvedValue({})
    })
  })
}))