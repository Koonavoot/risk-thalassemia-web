#!/bin/bash
# ============================================================
# setup_swap.sh — Add swap to prevent OOM on 4GB RAM server
# 
# Server specs: 2 Core CPU, 4GB RAM, 60GB HDD
# Run once on the production server: sudo bash setup_swap.sh
# ============================================================
set -euo pipefail

SWAP_SIZE="4G"
SWAP_FILE="/swapfile"

echo "=== Server Specs Check ==="
echo "Total RAM:"
free -h | head -2
echo ""
echo "Disk space:"
df -h / | tail -1
echo ""

# Check available disk space (need at least 5GB free for swap + system)
AVAIL_KB=$(df / | tail -1 | awk '{print $4}')
NEED_KB=$((5 * 1024 * 1024))  # 5GB in KB
if [ "$AVAIL_KB" -lt "$NEED_KB" ]; then
    echo "WARNING: Only $(( AVAIL_KB / 1024 / 1024 ))GB available on disk."
    echo "Need at least 5GB free (4GB swap + headroom)."
    echo "Consider reducing swap to 2G by editing SWAP_SIZE in this script."
    SWAP_SIZE="2G"
    echo "Auto-reduced swap to ${SWAP_SIZE}"
fi

# Check if swap already exists
if swapon --show | grep -q "${SWAP_FILE}"; then
    echo "Swap already configured at ${SWAP_FILE}:"
    swapon --show
    free -h
    exit 0
fi

# Create swap file
echo "Creating ${SWAP_SIZE} swap file at ${SWAP_FILE}..."
fallocate -l ${SWAP_SIZE} ${SWAP_FILE} 2>/dev/null || dd if=/dev/zero of=${SWAP_FILE} bs=1M count=$((4 * 1024)) status=progress
chmod 600 ${SWAP_FILE}
mkswap ${SWAP_FILE}
swapon ${SWAP_FILE}

# Make persistent across reboots
if ! grep -q "${SWAP_FILE}" /etc/fstab; then
    echo "${SWAP_FILE} none swap sw 0 0" >> /etc/fstab
    echo "Added swap to /etc/fstab (persistent)"
fi

# Optimize swappiness — low value = only swap when really needed
# 10 is good for a server that wants to keep ML models in RAM
sysctl vm.swappiness=10 2>/dev/null || true
if ! grep -q "vm.swappiness" /etc/sysctl.conf 2>/dev/null; then
    echo "vm.swappiness=10" >> /etc/sysctl.conf
fi

# Also reduce vfs_cache_pressure to keep filesystem cache longer
sysctl vm.vfs_cache_pressure=50 2>/dev/null || true
if ! grep -q "vm.vfs_cache_pressure" /etc/sysctl.conf 2>/dev/null; then
    echo "vm.vfs_cache_pressure=50" >> /etc/sysctl.conf
fi

echo ""
echo "=== Swap configured successfully ==="
free -h
echo ""
echo "=== Swap status ==="
swapon --show
echo ""
echo "=== Memory breakdown for Docker ==="
echo "Total RAM: 4GB"
echo "  OS + System:   ~500MB"
echo "  PostgreSQL:    ~256MB (limit)"
echo "  Backend (ML):  ~2.5GB (limit)"
echo "  Frontend:      ~256MB (limit)"
echo "  Swap backup:   ${SWAP_SIZE}"
echo ""
echo "Next step: cd /path/to/project && docker compose down && docker compose up -d --build"
