# GinkoHub Tools API

A collection of utility APIs for GitHub Pages projects, optimized for hosting on **Vercel** using Node.js (ESM).

## 🚀 Features
- **GitHub Scraper**: Fetch repo stats (stars, description) using direct scraping.
- **RSS Parser**: Convert any RSS/Atom feed to JSON.
- **Image Tools**: Convert images and read metadata using Jimp.
- **QR Generator**: Generate QR code data URIs from text.
- **System Info**: Monitor server health and uptime.
- **Swagger Docs**: Built-in interactive documentation.

## 📚 API Documentation
Once running, visit:
- **Local**: `http://localhost:3000/docs`
- **Vercel**: `https://your-project.vercel.app/docs`

## 🛠️ Local Setup
1. Clone the repository.
2. Install dependencies:
   ```bash
   npm install
   ```
3. Run the development server:
   ```bash
   npm run dev
   ```

## ☁️ Vercel Deployment

1. **Push to GitHub**:
   Ensure your remote is set to your GitHub repository.
   ```bash
   git push origin main
   ```

2. **Connect to Vercel**:
   - Go to [Vercel](https://vercel.com) and import your repository.
   - The configuration in `vercel.json` will automatically handle the Express routing.
   - No extra configuration is needed unless you have specific environment variables.

## 🧪 Technology Stack
- **Framework**: Express (ES Modules)
- **Scraping**: Axios + Cheerio
- **Imaging**: Jimp
- **Documentation**: Swagger JSDoc + Swagger UI
- **Hosting**: Vercel

---
Built with ❤️ by GinkoHub
