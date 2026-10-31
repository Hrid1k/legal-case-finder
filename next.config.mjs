/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    // keep the local embedding model + native bindings out of the webpack bundle
    serverComponentsExternalPackages: ['@xenova/transformers', 'onnxruntime-node', 'sharp', 'pg'],
  },
};
export default nextConfig;
