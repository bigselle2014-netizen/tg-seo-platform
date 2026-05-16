"""
Full pipeline: scrape channel -> generate meta -> ready for frontend.

Usage:
    python run_pipeline.py storyline_life_
    python run_pipeline.py storyline_life_ 100   # limit to 100 posts
"""
import sys
import asyncio
from telegram_scraper import scrape_channel_history
from meta_generator import generate_meta_batch


async def run(channel: str, limit: int = 0, meta_batch: int = 50):
    print(f"\n{'='*50}")
    print(f"  TG SEO Pipeline: @{channel}")
    print(f"{'='*50}\n")

    print("[1/2] Scraping channel posts...")
    new_posts = await scrape_channel_history(channel, limit=limit)
    print(f"      New posts saved: {new_posts}\n")

    print("[2/2] Generating SEO meta...")
    await generate_meta_batch(channel, batch_size=meta_batch)
    print()

    print(f"{'='*50}")
    print(f"  Pipeline complete!")
    print(f"  Start frontend: cd ../frontend && npm run dev")
    print(f"  Start API:      uvicorn api:app --port 8000")
    print(f"{'='*50}")


if __name__ == "__main__":
    channel = sys.argv[1] if len(sys.argv) > 1 else "storyline_life_"
    limit = int(sys.argv[2]) if len(sys.argv) > 2 else 0
    asyncio.run(run(channel, limit=limit))
