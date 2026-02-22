// Mock Database Client for Stateless Vercel Deployment
// This prevents the app from crashing if a stray db.model.action() is called.

export const db = new Proxy({}, {
  get: () => new Proxy({}, {
    get: () => async () => {
      console.log("Mock DB called. Returning empty array.");
      return []; 
    }
  })
}) as any;