# OpenAI API Key Setup Guide

## How to Add Your OpenAI API Key to Vercel

### Step 1: Get Your OpenAI API Key
1. Go to https://platform.openai.com/api-keys
2. Sign in to your OpenAI account
3. Click "Create new secret key"
4. Copy the key (you won't be able to see it again!)

### Step 2: Add to Vercel

1. **Go to Vercel Dashboard**
   - Visit https://vercel.com/dashboard
   - Select your project: `SaveYourGoblin`

2. **Navigate to Settings**
   - Click on your project
   - Go to **Settings** tab
   - Click **Environment Variables** in the left sidebar

3. **Add the Environment Variable**
   - Click **Add New**
   - **Name**: `OPENAI_API_KEY`
   - **Value**: Paste your OpenAI API key
   - **Environment**: Select all (Production, Preview, Development)
   - Click **Save**

4. **Redeploy**
   - Go to **Deployments** tab
   - Click the three dots (⋯) on your latest deployment
   - Click **Redeploy**
   - Or push a new commit to trigger automatic deployment

### Step 3: Verify It Works

After redeploying:
1. Go to your deployed site
2. Try generating content
3. You should now get real AI-generated content instead of mock data!

## Local Development

For local development, create a `.env.local` file in your project root:

```env
OPENAI_API_KEY=sk-your-api-key-here
```

**Important**: Never commit `.env.local` to git! It's already in `.gitignore`.

## Cost Information

- **Model**: GPT-4o-mini
- **Cost**: 
  - Input: $0.15 per million tokens
  - Output: $0.60 per million tokens
- **Typical generation**: ~500-1000 tokens per content item
- **Estimated cost**: ~$0.0003-0.0006 per generation

## Troubleshooting

- **"OPENAI_API_KEY not found"**: Make sure you added it to Vercel and redeployed
- **"Rate limit exceeded"**: You've hit OpenAI's rate limit, wait a moment
- **"Invalid API key"**: Check that you copied the key correctly
- **Still getting mock data**: The code falls back to mocks if there's an error - check Vercel logs
