<template>
  <div id="app">
    <router-view />
  </div>
</template>

<script>
export default {
  name: 'App'
}
</script>

<style>
body {
  margin: 0;
  padding: 0;
  font-family: Arial, sans-serif;
  background-color: #f0f0f0;
  overflow: hidden;
}

#app {
  width: 100vw;
  height: 100vh;
  display: flex;
  flex-direction: column;
}

button {
  cursor: pointer;
  padding: 8px 16px;
  border: none;
  border-radius: 4px;
  background-color: #28a745;
  color: white;
  font-size: 14px;
  margin: 5px;
  transition: background-color 0.2s;
}

button:hover {
  background-color: #218838;
}

button:disabled {
  background-color: #6c757d;
  cursor: not-allowed;
}

button.secondary {
  background-color: #6c757d;
}

button.secondary:hover {
  background-color: #5a6268;
}

button.danger {
  background-color: #dc3545;
}

button.danger:hover {
  background-color: #c82333;
}

input {
  padding: 8px;
  border: 1px solid #ced4da;
  border-radius: 4px;
  margin: 5px;
  font-size: 14px;
}

.card {
  position: relative;
  transition: transform 0.2s, filter 0.2s;
}

.card:hover {
  transform: translateY(-10px);
  z-index: 10;
}

.card.unplayable {
  filter: brightness(70%);
}

.avatar {
  width: 50px;
  height: 50px;
  border-radius: 50%;
  background-color: #f8f9fa;
  border: 2px solid #dee2e6;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
}

.avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.player-info {
  display: flex;
  align-items: center;
  margin: 5px;
}

.player-name {
  margin-left: 10px;
  font-weight: bold;
}

.pass-count {
  margin-left: 10px;
  color: #6c757d;
}

.game-board {
  position: relative;
  width: 100%;
  height: 100%;
  background-color: #1b7e44; /* Grüner Spieltischhintergrund */
  overflow: hidden;
}

.center-cards {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
}

.hand-container {
  position: absolute;
  bottom: 10px;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  justify-content: center;
}

.opponents-container {
  position: absolute;
  top: 10px;
  left: 0;
  right: 0;
  display: flex;
  justify-content: space-around;
}
</style>