#!/bin/bash

# Codexa Server - Quick Start Script
# This script helps you get the Codexa server running quickly with Docker

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Print colored message
print_message() {
    echo -e "${2}${1}${NC}"
}

print_error() {
    print_message "❌ $1" "$RED"
}

print_success() {
    print_message "✅ $1" "$GREEN"
}

print_info() {
    print_message "ℹ️  $1" "$BLUE"
}

print_warning() {
    print_message "⚠️  $1" "$YELLOW"
}

# Check if Docker is installed
check_docker() {
    if ! command -v docker &> /dev/null; then
        print_error "Docker is not installed. Please install Docker first."
        echo "Visit: https://docs.docker.com/get-docker/"
        exit 1
    fi
    
    if ! command -v docker-compose &> /dev/null && ! docker compose version &> /dev/null; then
        print_error "Docker Compose is not installed. Please install Docker Compose first."
        echo "Visit: https://docs.docker.com/compose/install/"
        exit 1
    fi
    
    print_success "Docker and Docker Compose are installed"
}

# Check if .env file exists
check_env() {
    if [ ! -f .env ]; then
        print_warning ".env file not found. Creating from .env.example..."
        if [ -f .env.example ]; then
            cp .env.example .env
            print_success ".env file created"
            print_warning "⚠️  IMPORTANT: Please edit .env file and add your configuration!"
            echo ""
            read -p "Press Enter to continue after updating .env, or Ctrl+C to exit..."
        else
            print_error ".env.example not found. Cannot create .env file."
            exit 1
        fi
    else
        print_success ".env file exists"
    fi
}

# Start services
start_services() {
    MODE=${1:-development}
    
    if [ "$MODE" = "production" ]; then
        print_info "Starting services in PRODUCTION mode..."
        docker-compose -f docker-compose.prod.yml up -d
    else
        print_info "Starting services in DEVELOPMENT mode (with hot-reload)..."
        docker-compose up -d
    fi
    
    print_success "Services are starting..."
    echo ""
    print_info "Waiting for services to be healthy..."
    sleep 10
}

# Show service status
show_status() {
    echo ""
    print_info "Service Status:"
    docker-compose ps
    echo ""
    
    print_info "Service URLs:"
    echo "  🔐 Auth Service:       http://localhost:3000"
    echo "  🛠️  Utils Service:      http://localhost:3001"
    echo "  📝 Problem Service:    http://localhost:3002"
    echo "  🎓 Classroom Service:  http://localhost:3003"
    echo "  💻 Code Service:       http://localhost:3004"
    echo "  📊 Analytics Service:  http://localhost:3005"
    echo "  🤖 AI Service:         http://localhost:3006"
    echo ""
    echo "  🗄️  PostgreSQL:         localhost:5432"
    echo "  📮 Redis:              localhost:6379"
    echo "  📨 Kafka:              localhost:9092"
}

# Show logs
show_logs() {
    print_info "Showing logs (Ctrl+C to exit)..."
    docker-compose logs -f
}

# Stop services
stop_services() {
    print_info "Stopping services..."
    docker-compose down
    print_success "Services stopped"
}

# Main menu
show_menu() {
    echo ""
    echo "╔════════════════════════════════════════╗"
    echo "║   🚀 Codexa Server - Docker Setup    ║"
    echo "╚════════════════════════════════════════╝"
    echo ""
    echo "1) Start services (Development - Hot Reload)"
    echo "2) Start services (Production)"
    echo "3) View logs"
    echo "4) Stop services"
    echo "5) Restart services"
    echo "6) Rebuild services"
    echo "7) Show status"
    echo "8) Run database migrations"
    echo "9) Clean up (stop and remove containers)"
    echo "0) Exit"
    echo ""
    read -p "Choose an option [0-9]: " choice
    
    case $choice in
        1)
            check_docker
            check_env
            start_services development
            show_status
            show_menu
            ;;
        2)
            check_docker
            check_env
            start_services production
            show_status
            show_menu
            ;;
        3)
            show_logs
            show_menu
            ;;
        4)
            stop_services
            show_menu
            ;;
        5)
            print_info "Restarting services..."
            docker-compose restart
            print_success "Services restarted"
            show_menu
            ;;
        6)
            print_info "Rebuilding services..."
            docker-compose build
            docker-compose up -d
            print_success "Services rebuilt and started"
            show_menu
            ;;
        7)
            show_status
            show_menu
            ;;
        8)
            print_info "Running database migrations..."
            docker-compose exec -w /app/db-service auth-service npx prisma migrate deploy
            print_success "Migrations complete"
            show_menu
            ;;
        9)
            read -p "⚠️  This will remove all containers. Continue? [y/N]: " confirm
            if [[ $confirm =~ ^[Yy]$ ]]; then
                docker-compose down
                print_success "Cleanup complete"
            else
                print_info "Cleanup cancelled"
            fi
            show_menu
            ;;
        0)
            print_success "Goodbye! 👋"
            exit 0
            ;;
        *)
            print_error "Invalid option"
            show_menu
            ;;
    esac
}

# Check if running with arguments
if [ $# -gt 0 ]; then
    case "$1" in
        start)
            check_docker
            check_env
            start_services development
            show_status
            ;;
        start-prod)
            check_docker
            check_env
            start_services production
            show_status
            ;;
        stop)
            stop_services
            ;;
        logs)
            show_logs
            ;;
        status)
            show_status
            ;;
        *)
            echo "Usage: $0 {start|start-prod|stop|logs|status}"
            echo "Or run without arguments for interactive menu"
            exit 1
            ;;
    esac
else
    # Show interactive menu
    show_menu
fi
