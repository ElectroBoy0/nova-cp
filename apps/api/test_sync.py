import asyncio
import os
import sys

from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker

sys.path.append(os.path.join(os.path.dirname(__file__), "apps", "api"))
from app.config import settings
from app.services.sync_service import SyncService

async def main():
    engine = create_async_engine(settings.DATABASE_URL)
    factory = sessionmaker(engine, expire_on_commit=False, class_=AsyncSession)
    
    async with factory() as session:
        # Get user
        from sqlalchemy import select
        from app.models.user import CFHandle
        res = await session.execute(select(CFHandle).limit(1))
        handle_obj = res.scalar_one_or_none()
        if not handle_obj:
            print("No handles found")
            return
            
        print(f"Syncing {handle_obj.handle} for user {handle_obj.user_id}...")
        try:
            sync = SyncService(session)
            await sync.run_full_sync(handle_obj.user_id, handle_obj.handle)
            print("Done")
        except Exception as e:
            import traceback
            traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(main())
