import axios from 'axios';

async function testApi() {
  try {
    const routes = await axios.get('http://localhost:3000/api/v1/geo/routes');
    console.log('Routes List:', routes.data);
    
    const exodo = await axios.get('http://localhost:3000/api/v1/geo/routes/exodo');
    console.log('Exodo Route:', exodo.data.data.title, 'with', exodo.data.data.waypoints.length, 'waypoints');
    
    const graph = await axios.get('http://localhost:3000/api/v1/rag/graph?q=Êxodo');
    console.log('Êxodo Graph:', graph.data.data.nodes.length, 'nodes');
  } catch (error) {
    console.error('API Test failed (is the server running?):', error.message);
  }
}

testApi();
