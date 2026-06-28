import pygame
import sys

# Initialize Pygame
pygame.init()

# Game Constants
WIDTH, HEIGHT = 800, 800
BG_COLOR = (20, 20, 30)
TRIANGLE_COLOR = (0, 255, 150)
FPS = 60

# Setup Display
screen = pygame.display.set_mode((WIDTH, HEIGHT))
pygame.display.set_caption("Sierpinski Triangle Simulation")
clock = pygame.time.Clock()

def draw_sierpinski(p1, p2, p3, depth):
    """Recursively draws the Sierpinski Triangle."""
    if depth == 0:
        # Draw the filled triangle at the base level
        pygame.draw.polygon(screen, TRIANGLE_COLOR, [p1, p2, p3])
    else:
        # Calculate midpoints of each side
        mid1 = ((p1[0] + p2[0]) // 2, (p1[1] + p2[1]) // 2)
        mid2 = ((p2[0] + p3[0]) // 2, (p2[1] + p3[1]) // 2)
        mid3 = ((p3[0] + p1[0]) // 2, (p3[1] + p1[1]) // 2)

        # Recursively draw the three smaller triangles
        draw_sierpinski(p1, mid1, mid3, depth - 1)
        draw_sierpinski(mid1, p2, mid2, depth - 1)
        draw_sierpinski(mid3, mid2, p3, depth - 1)

def main():
    # Define the large bounding triangle vertices
    top = (WIDTH // 2, 50)
    bottom_left = (50, HEIGHT - 50)
    bottom_right = (WIDTH - 50, HEIGHT - 50)

    current_depth = 1
    running = True
    
    # Instructions to change depth with keys
    font = pygame.font.SysFont("Arial", 24)

    while running:
        screen.fill(BG_COLOR)

        for event in pygame.event.get():
            if event.type == pygame.QUIT:
                running = False
            elif event.type == pygame.KEYDOWN:
                if event.key == pygame.K_UP:
                    current_depth += 1
                elif event.key == pygame.K_DOWN:
                    current_depth = max(1, current_depth - 1)

        # Draw the fractal
        draw_sierpinski(top, bottom_left, bottom_right, current_depth)

        # Display instructions and current depth
        instr = font.render(f"Depth: {current_depth} | Use UP/DOWN arrows to change complexity", True, (255, 255, 255))
        screen.blit