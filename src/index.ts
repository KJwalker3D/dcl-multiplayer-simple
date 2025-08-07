import { Color4, Vector3 } from '@dcl/sdk/math'
import { engine, InputAction, Material, MeshCollider, MeshRenderer, pointerEventsSystem, Transform } from '@dcl/sdk/ecs'
import { syncEntity, isStateSyncronized } from '@dcl/sdk/network'

const colors = [Color4.Black(), Color4.White(), Color4.Red(), Color4.Green(), Color4.Blue(), Color4.Yellow(), Color4.Magenta(), Color4.fromHexString('#00FFFF')]
let currentColorIndex = 0

export function main() {
  // Create cube immediately for all players
  const cube = engine.addEntity()
  MeshRenderer.setBox(cube)
  MeshCollider.setBox(cube)
  Transform.create(cube, { position: Vector3.create(8, 1, 8) })
  Material.setBasicMaterial(cube, { diffuseColor: colors[currentColorIndex] })
  
  // Mark entity as synced - only sync the Material component since that's what changes
  syncEntity(cube, [Material.componentId], 1000)
  
  pointerEventsSystem.onPointerDown(
    { entity: cube, opts: { button: InputAction.IA_PRIMARY, hoverText: 'Click to change color' } },
    () => {
      // Only sync color changes when state is synchronized
      if (isStateSyncronized()) {
        currentColorIndex = (currentColorIndex + 1) % colors.length
        Material.setBasicMaterial(cube, { diffuseColor: colors[currentColorIndex] })
        // No need to call syncEntity again - the entity is already synced!
      }
    }
  )
}



// Test results: 

// 1. Player 1 loads in and sees the cube
// 2. Player 2 loads in and sees the cube and player 1
// 3. Player 1 clicks the cube and the color doesnt change
// 4. Player 1 does not see player 2 (even after running away and coming back)
// Therefore the players aren't in sync so the cube cannot be synced. 
