import { Color4, Vector3 } from '@dcl/sdk/math'
import { engine, InputAction, Material, MeshCollider, MeshRenderer, pointerEventsSystem, Transform } from '@dcl/sdk/ecs'
import { syncEntity, isStateSyncronized } from '@dcl/sdk/network'
import { MessageBus } from '@dcl/sdk/message-bus'

const colors = [Color4.Black(), Color4.White(), Color4.Red(), Color4.Green(), Color4.Blue(), Color4.Yellow(), Color4.Magenta(), Color4.fromHexString('#00FFFF')]
let currentColorIndex = 0
let cubeCreated = false
const sceneMessageBus = new MessageBus()

export function main() {
  engine.addSystem(() => {
    if (!cubeCreated) {
      // Try DCL-compliant sync first, fallback to MessageBus for local testing
      if (isStateSyncronized()) {
        createSyncedCube()
      } else {
        // Fallback: create cube with MessageBus for local testing
        createMessageBusCube()
      }
    }
  })
}

function createSyncedCube() {
  const cube = engine.addEntity()
  MeshRenderer.setBox(cube)
  MeshCollider.setBox(cube)
  Transform.create(cube, { position: Vector3.create(8, 1, 8) })
  Material.setBasicMaterial(cube, { diffuseColor: colors[currentColorIndex] })
  
  syncEntity(cube, [Material.componentId], 1)
  
  pointerEventsSystem.onPointerDown(
    { entity: cube, opts: { button: InputAction.IA_PRIMARY, hoverText: 'Click to change color' } },
    () => {
      currentColorIndex = (currentColorIndex + 1) % colors.length
      Material.setBasicMaterial(cube, { diffuseColor: colors[currentColorIndex] })
      syncEntity(cube, [Material.componentId], 1)
    }
  )
  
  cubeCreated = true
}

function createMessageBusCube() {
  const cube = engine.addEntity()
  MeshRenderer.setBox(cube)
  MeshCollider.setBox(cube)
  Transform.create(cube, { position: Vector3.create(8, 1, 8) })
  Material.setBasicMaterial(cube, { diffuseColor: colors[currentColorIndex] })
  
  pointerEventsSystem.onPointerDown(
    { entity: cube, opts: { button: InputAction.IA_PRIMARY, hoverText: 'Click to change color' } },
    () => {
      currentColorIndex = (currentColorIndex + 1) % colors.length
      Material.setBasicMaterial(cube, { diffuseColor: colors[currentColorIndex] })
      sceneMessageBus.emit('colorChange', { colorIndex: currentColorIndex })
    }
  )
  
  sceneMessageBus.on('colorChange', (data: { colorIndex: number }) => {
    currentColorIndex = data.colorIndex
    Material.setBasicMaterial(cube, { diffuseColor: colors[currentColorIndex] })
  })
  
  cubeCreated = true
}
