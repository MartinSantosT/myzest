# Zest Recipe Manager - Marketing Templates

> "Other recipe apps store recipes. Zest stores the moments around the table."

Ready-to-post marketing content for launching Zest across platforms.

---

## 1. Reddit r/selfhosted

### Title
[Zest] – A self-hosted recipe manager with Memories and shareable Moment Cards. Single Docker container, no external DB.

### Body

I built Zest because existing recipe managers felt clinical. They're great at storing recipes, but they miss what makes cooking special—the moments, the people, the stories.

**What's different:**
- **Memories**: A food diary with photos where you capture and relive meals
- **Moment Cards**: Create beautiful, shareable social images from your recipes (perfect for Instagram/Twitter)
- **Cookbooks**: Organize recipes and export as PDF
- **What to Cook?**: Search recipes by ingredients you have on hand
- **Cooking Mode**: Timers, notes, step-by-step guidance without leaving the kitchen

**Tech stack**: FastAPI + SQLite + Vanilla JS (no build tools, no Node modules)

**Quick start:**
```
docker run -p 5000:5000 -v zest-data:/data ghcr.io/MartinSantosT/zest:latest
```
Visit http://localhost:5000

**Try the demo**: https://demo.myzest.app
**GitHub**: https://github.com/MartinSantosT/myzest (MIT license)

I'd love feedback. What would make a recipe manager actually useful for you?

---

## 2. Reddit r/homelab

### Title
[Zest] Single-container recipe manager with a clean Docker setup

### Body

Just released Zest – a recipe manager that runs entirely in one Docker container. No external database, no complex orchestration. SQLite inside, volumes for persistence.

Features:
- Memories (food diary with photos)
- Shareable Moment Cards
- PDF export for cookbooks
- Ingredient-based search
- Built-in cooking mode with timers

**One-liner:**
```
docker run -p 5000:5000 -v zest-data:/data ghcr.io/MartinSantosT/zest:latest
```

Stack: FastAPI, Vanilla JS, Tailwind CSS. No build tools.

Demo: https://demo.myzest.app
Source: https://github.com/MartinSantosT/myzest (MIT)

---

## 3. Hacker News "Show HN"

### Title
Show HN: Zest – Self-hosted recipe manager with Memories and shareable cards

### Description

Zest is a self-hosted recipe manager that goes beyond storage. It captures the moments around recipes through Memories (photo diary) and Moment Cards (beautiful shareable images).

Single Docker container, FastAPI + SQLite + Vanilla JS. No external dependencies, no build tools. Features include recipe scraping, cookbooks with PDF export, ingredient-based search, and a focused cooking mode.

MIT licensed. Demo at demo.myzest.app, source at github.com/MartinSantosT/myzest

---

## 4. Twitter/X Post

Introducing Zest 🥘 – A self-hosted recipe manager that captures the moments around the table, not just the recipes. Memories, shareable Moment Cards, one Docker container. Try it: https://demo.myzest.app MIT licensed. https://github.com/MartinSantosT/myzest

---

## 5. LinkedIn Post

**Building Zest: Why I Started a Recipe Manager**

I've always believed cooking is about more than instructions and ingredients. It's about the people at the table, the stories you tell while you're cooking, and the meals that stick with you years later.

Most recipe apps treat recipes like database records. But how many of you actually look back at your cooking history? Or remember *why* a particular dish mattered?

That's why I built **Zest**. It's a self-hosted recipe manager designed to preserve those moments:

✓ **Memories** – A food diary where you capture meals with photos and notes
✓ **Moment Cards** – Beautiful shareable images of your recipes and cooking moments
✓ **Cookbooks** – Organize recipes and export as polished PDFs
✓ **Smart Search** – "What to Cook?" finds recipes based on what you have
✓ **Cooking Mode** – Focused, timer-friendly interface for the kitchen

Built with FastAPI and SQLite in a single Docker container. No external services, no subscriptions. Just your recipes, your moments, your data.

It's open source (MIT license), and I'd love for this to be a tool that brings back the joy in cooking—not just the efficiency.

Check it out: https://demo.myzest.app | Source: https://github.com/MartinSantosT/myzest

What memories do you want to preserve about your cooking?

---

## 6. Product Hunt

### Tagline
A self-hosted recipe manager that captures the moments around the table through Memories and shareable Moment Cards.

### Description

**The problem:** Recipe apps are built for storing recipes, not for remembering why they matter.

**The solution:** Zest goes beyond recipes. It's designed around the moments—the family dinners, the failed experiments, the dishes that became traditions.

**What you get:**
- 📸 **Memories**: A photo-based food diary where you capture and relive meals
- 🎨 **Moment Cards**: Create beautiful, shareable images perfect for social media
- 📚 **Cookbooks**: Curate recipes and export as PDFs
- 🔍 **Ingredient Search**: "What to Cook?" finds recipes from what you have
- ⏱️ **Cooking Mode**: Timers and step-by-step guidance, no distractions
- 🔗 **4-Tier Web Scraper**: Import recipes from across the web

**Why it's different:**
- Completely self-hosted. One Docker container. SQLite inside.
- No build tools, no Node modules, no external dependencies
- MIT licensed and open source
- Built with FastAPI, Vanilla JS, and Tailwind CSS

Whether you're a home chef, a food blogger, or just someone who loves cooking, Zest is designed to help you cook with more intention and remember your meals with more joy.

**Get started instantly:** Demo at https://demo.myzest.app

---

## General Tips for Posting

- **Timing**: Post on weekdays (Tuesday-Thursday) between 9-11 AM in your target timezone
- **Reddit**: Be authentic. Answer questions in comments. Don't hard-sell.
- **HN**: Keep it technical. Mention the stack. Let the project speak for itself.
- **Twitter**: Use the 280 chars efficiently. Emojis are your friend.
- **LinkedIn**: Share the journey. People connect with why you built it, not just what it does.
- **Product Hunt**: Be present for launch day. Respond to every comment.

---

## Links (for easy copy-paste)

- **Website**: https://myzest.app
- **Demo**: https://demo.myzest.app
- **GitHub**: https://github.com/MartinSantosT/myzest
- **License**: MIT

---

## Key Differentiators (Reference for all posts)

Always emphasize these unique aspects:
1. **Memories** – No other recipe manager does this (food diary with photos)
2. **Moment Cards** – Shareable social images from recipes
3. **Single Container** – Dead simple to self-host
4. **No Build Tools** – Pure FastAPI + Vanilla JS
5. **MIT Licensed** – Truly open source, no corporate backing

---

*Last updated: February 2026*
