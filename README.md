# TikTok Style Feed App (Expo + Supabase)

A high-performance, open-source social media feed template built with Expo and Supabase. This project features a TikTok-style vertical video feed, post creation with media support, and a robust backend integration.

## 🚀 Recent Improvements & Bug Fixes

This repository has been recently refactored to be more accessible for open-source developers by removing proprietary dependencies:

- **CDN Replacement**: Removed Bunny CDN dependency and integrated **Supabase Storage** for all media (images and videos).
- **Simplified Database**: Resolved issues with missing tables (like `post_interactions` and `user_reposts`) by providing a comprehensive `SUPABASE_SETUP.sql` migration.
- **Feed Synchronization**: Fixed a bug where new posts wouldn't appear in the feed until a manual refresh.
- **Cleaned UI**: Removed unused features like the "Gift" system to focus on core social interactions.
- **Enhanced Security**: Added Row Level Security (RLS) policies to all core tables.

## ✨ Features

- **TikTok Style Feed**: Smooth vertical scrolling video/image feed.
- **Post Creation**: Support for text, photo, and video posts.
- **Auth System**: Full Supabase Auth integration.
- **Interactions**: Upvote, downvote, and share functionality.
- **Circle Memberships**: Organize content and users within circles.
- **Responsive Skeletons**: Beautiful loading states for a premium feel.

## 🛠 Tech Stack

- **Frontend**: Expo (React Native), Expo Router, Lucide/Ionicons.
- **Backend**: Supabase (PostgreSQL, Auth, Storage).
- **Styling**: Vanilla React Native StyleSheet with responsive utilities.

## 🏁 Getting Started

### 1. Prerequisites

- [Node.js](https://nodejs.org/) (v18+)
- [Expo Go](https://expo.dev/go) app on your mobile device (to test)
- A [Supabase](https://supabase.com/) project

### 2. Setup Environment

Create a `.env` file in the root directory based on `.env.example`:

```env
EXPO_PUBLIC_SUPABASE_URL=your_supabase_url
EXPO_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_PROJECT_ID=your_project_id
```

### 3. Database Setup

1. Go to your Supabase SQL Editor.
2. Run the code found in `supabase/migrations/SUPABASE_SETUP.sql`. This will create:
   - Necessary tables (`users`, `circle_posts`, etc.)
   - RLS Policies.
   - The `get_ranked_feed` RPC function used for the main feed.
3. Ensure your Storage buckets (`public-media`) are created and public.

### 4. Install & Run

```bash
# Install dependencies
npm install

# Start the app
npx expo start -c
```

## 📂 Project Structure

- `app/`: Expo Router file-based navigation.
- `components/`: Reusable UI elements (Feed, VideoItem, Skeletons).
- `contexts/`: React Contexts for Auth, Posts, and Feed state.
- `hooks/`: Custom hooks for data fetching and interactions.
- `utils/`: Helper functions for Supabase, media upload, and post logic.
- `supabase/`: SQL migrations and setup scripts.

## 🤝 Contributing

Contributions are welcome! Feel free to open issues or submit pull requests to improve the feed algorithm, add new features, or fix bugs.

## 📄 License

MIT License. Feel free to use this template for your own projects!
