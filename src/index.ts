// We define the empty imports so the auto-complete feature works as expected.
import { Color4, Vector3 } from '@dcl/sdk/math'
import { engine, InputAction, Material, MeshCollider, MeshRenderer, pointerEventsSystem, Transform } from '@dcl/sdk/ecs'

import { changeColorSystem, circularSystem } from './systems'
import { syncEntity, isStateSyncronized } from '@dcl/sdk/network'
import { MessageBus } from '@dcl/sdk/message-bus'

// Define enum for synced entities to ensure consistent IDs across clients
enum EntityEnumId {
  MULTIPLAYER_CUBE = 1,
}

// Array of colors to cycle through
const colors = [
  Color4.Black(),
  Color4.White(),
  Color4.Red(),
  Color4.Green(),
  Color4.Blue(),
  Color4.Yellow(),
  Color4.Magenta(),
  Color4.Blue(),
  Color4.fromHexString('#FF6B35'), // Orange
  Color4.fromHexString('#8B5CF6'), // Purple
]

let currentColorIndex = 0
let cubeCreated = false
let frameCount = 0

// Create message bus for additional debugging
const sceneMessageBus = new MessageBus()

// Message types for color syncing
type ColorChangeMessage = {
  colorIndex: number
  timestamp: number
}

export function main() {
  
console.log('Scene starting...')
console.log('Initial isStateSyncronized():', isStateSyncronized())

// Listen for player join messages
sceneMessageBus.on('playerJoined', (data) => {
  console.log('Player joined:', data)
})

// Listen for test messages
sceneMessageBus.on('testMessage', (data) => {
  console.log('Received test message:', data)
})

// Listen for color change messages from other players
sceneMessageBus.on('colorChange', (data: ColorChangeMessage) => {
  console.log('Received color change from other player:', data)
  currentColorIndex = data.colorIndex
  if (cubeCreated) {
    // Find the cube entity and update its color
    const entitiesWithMeshRenderer = engine.getEntitiesWith(MeshRenderer)
    for (const [entity] of entitiesWithMeshRenderer) {
      // Update the first entity with MeshRenderer (our cube)
      Material.setBasicMaterial(entity, {
        diffuseColor: colors[currentColorIndex]
      })
      console.log('Updated cube color to match other player:', colors[currentColorIndex])
      break // Only update the first one (our cube)
    }
  }
})

// Send a test message to see if communication works
sceneMessageBus.emit('testMessage', { message: 'Hello from player', timestamp: Date.now() })

function createMultiplayerCube() {
  const testMultiplayerCube = engine.addEntity()
  MeshRenderer.setBox(testMultiplayerCube)
  MeshCollider.setBox(testMultiplayerCube)
  
  Transform.create(testMultiplayerCube, {
    position: Vector3.create(8, 1, 8)
  })
  
  Material.setBasicMaterial(testMultiplayerCube, {
    diffuseColor: colors[currentColorIndex]
  })
  
  // Sync the entity with Material component for color changes (for when sync works)
  syncEntity(testMultiplayerCube, [Material.componentId], EntityEnumId.MULTIPLAYER_CUBE)
  
  pointerEventsSystem.onPointerDown(
    {
      entity: testMultiplayerCube, 
      opts: { button: InputAction.IA_PRIMARY, hoverText: 'Click to change color' },
    },
    function () {
      // Try sync entity first, fallback to MessageBus
      if (isStateSyncronized()) {
        // Use sync entity method
        currentColorIndex = (currentColorIndex + 1) % colors.length
        Material.setBasicMaterial(testMultiplayerCube, {
          diffuseColor: colors[currentColorIndex]
        })
        syncEntity(testMultiplayerCube, [Material.componentId], EntityEnumId.MULTIPLAYER_CUBE)
        console.log('Color changed via sync entity:', colors[currentColorIndex])
      } else {
        // Use MessageBus fallback
        currentColorIndex = (currentColorIndex + 1) % colors.length
        Material.setBasicMaterial(testMultiplayerCube, {
          diffuseColor: colors[currentColorIndex]
        })
        
        // Send color change message to other players
        sceneMessageBus.emit('colorChange', {
          colorIndex: currentColorIndex,
          timestamp: Date.now()
        })
        console.log('Color changed via MessageBus:', colors[currentColorIndex])
      }
    }
  )
  
  cubeCreated = true
  console.log('Multiplayer cube created and synced')
}

// System to continuously check sync state and create cube when ready
engine.addSystem(() => {
  frameCount++
  
  if (isStateSyncronized() && !cubeCreated) {
    console.log('State synchronized - creating cube')
    createMultiplayerCube()
  } else if (!isStateSyncronized() && !cubeCreated) {
    if (frameCount % 60 === 0) { // Log every second instead of every frame
      console.log('State not synchronized - waiting... (frame:', frameCount, ')')
      console.log('isStateSyncronized():', isStateSyncronized())
    }
    
    // After 5 seconds (300 frames), create a local test cube for development
    if (frameCount > 300 && !cubeCreated) {
      console.log('Creating local test cube for development (multiplayer sync not working in preview)')
      createMultiplayerCube()
    }
  }
})

}
