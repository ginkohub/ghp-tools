# GinkoHub Tools API

A collection of utility APIs for GitHub Pages projects, optimized for hosting on **Serv00** using Node.js and Phusion Passenger.

## 🚀 Features
- **GitHub Scraper**: Fetch repo stars and user info without API tokens.
- **RSS Parser**: Convert any RSS/Atom feed to JSON.
- **Image Tools**: Convert images between formats (PNG, WebP, JPG, AVIF) and read metadata.
- **QR Generator**: Generate QR code data URIs from text.
- **System Info**: Monitor server health and uptime.
- **Swagger Docs**: Built-in interactive documentation.

## 📚 API Documentation
Once running, visit:
- **Local**: `http://localhost:3000/docs`
- **Production**: `https://your-domain.com/docs`

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

## ☁️ Serv00 Deployment (Phusion Passenger)
Based on the [Serv00 Node.js Guide](https://docs.serv00.com/Node.js/):

1. **Panel Setup**:
   - Create a new website of type **Node.js**.
   - Note the domain directory: `~/domains/your-domain/public_nodejs/`.

2. **Upload**:
   - Upload all files (except `node_modules` and `.env`) to the `public_nodejs` folder.
   - Ensure `app.js` is in the root of that folder.

3. **SSH Setup**:
   ```bash
   cd ~/domains/your-domain/public_nodejs/
   
   # Optional: Set Node version to v22
   echo "export PATH=/usr/local/bin/node22/bin:\$PATH" >> ~/.bash_profile
   source ~/.bash_profile
   
   # Install production dependencies
   npm install --production
   ```

4. **Restart**:
   Whenever you update code, restart the app via panel or command:
   ```bash
   devil www restart your-domain
   ```

## 🧪 Technology Stack
- **Framework**: Express (ES Modules)
- **Scraping**: Axios + Cheerio
- **Imaging**: Sharp
- **Documentation**: Swagger JSDoc + Swagger UI
- **Hosting**: Serv00 (FreeBSD + Phusion Passenger)

---
Built with ❤️ by GinkoHub
