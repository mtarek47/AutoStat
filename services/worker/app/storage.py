import os
import shutil

class StorageClient:
    """Helper client for cloud object storage (S3 / R2 / MinIO) or local file cache."""
    
    def __init__(self, base_cache_dir: str = "/tmp/datasets"):
        self.base_cache_dir = base_cache_dir
        os.makedirs(self.base_cache_dir, exist_ok=True)

    def get_local_path(self, storage_key: str) -> str:
        return os.path.join(self.base_cache_dir, os.path.basename(storage_key))

    def save_file(self, source_path: str, storage_key: str) -> str:
        destination = self.get_local_path(storage_key)
        shutil.copyfile(source_path, destination)
        return destination
