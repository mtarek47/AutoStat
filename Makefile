.PHONY: start dev build test clean up down frontend-dev frontend-build electron-dev electron-pack electron-open

start:
	./run.sh

dev:
	./run.sh

electron-dev:
	cd frontend && npm run electron:dev

electron-pack:
	cd frontend && npm run electron:pack

electron-open:
	open frontend/dist/mac-arm64/AutoStat.app

test-rust:
	cargo test --manifest-path crates/spss_core/Cargo.toml

test-python:
	pytest tests/

test: test-rust test-python

up:
	docker compose -f docker/docker-compose.yml up --build

down:
	docker compose -f docker/docker-compose.yml down

clean:
	cargo clean --manifest-path crates/spss_core/Cargo.toml
	rm -rf frontend/dist frontend/out frontend/.next
	find . -type d -name "__pycache__" -exec rm -rf {} +
	find . -type d -name "*.egg-info" -exec rm -rf {} +
