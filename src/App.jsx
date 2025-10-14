import { FormControl, Container, Button, Card } from "react-bootstrap";
import { useState, useEffect } from "react";
import "./App.css";

// Variables d'environnement avec fallback
const clientId = import.meta.env.VITE_CLIENT_ID || "";
const clientSecret = import.meta.env.VITE_CLIENT_SECRET || "";

function App() {
  const [searchInput, setSearchInput] = useState("");
  const [accessToken, setAccessToken] = useState("");
  const [albums, setAlbums] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [hasSearched, setHasSearched] = useState(false);
  const [configError, setConfigError] = useState("");

  // Vérification de la configuration au chargement
  useEffect(() => {
    if (!clientId || !clientSecret) {
      setConfigError("Configuration manquante - L'application n'est pas configurée correctement pour la production");
      return;
    }
  }, []);

  useEffect(() => {
    // Ne pas essayer de s'authentifier si les credentials sont manquants
    if (!clientId || !clientSecret) {
      return;
    }

    let authParams = {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body:
        "grant_type=client_credentials&client_id=" +
        clientId +
        "&client_secret=" +
        clientSecret,
    };

    fetch("https://accounts.spotify.com/api/token", authParams)
      .then((result) => result.json())
      .then((data) => {
        if (data.error) {
          setError("Erreur d'authentification Spotify - Vérifiez les clés API");
          return;
        }
        setAccessToken(data.access_token);
      })
      .catch((err) => {
        setError("Erreur de connexion à Spotify");
      });
  }, []);

  async function search() {
    // Si la recherche est vide, on remet à l'état initial
    if (!searchInput.trim()) {
      setAlbums([]);
      setError("");
      setHasSearched(false);
      return;
    }
    
    // Vérifier la configuration avant de rechercher
    if (!clientId || !clientSecret) {
      setError("Application non configurée - Contactez l'administrateur");
      return;
    }

    // Vérifier que l'access token est disponible
    if (!accessToken) {
      setError("Connexion à Spotify en cours... Réessayez dans quelques secondes");
      return;
    }
    
    setLoading(true);
    setError("");
    setHasSearched(true);

    try {
      let artistParams = {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer " + accessToken,
        },
      };

      // Get Artist
      const artistResponse = await fetch(
        "https://api.spotify.com/v1/search?q=" + searchInput + "&type=artist",
        artistParams
      );
      
      if (!artistResponse.ok) {
        throw new Error(`Erreur API: ${artistResponse.status}`);
      }
      
      const artistData = await artistResponse.json();
      
      if (!artistData.artists?.items?.length) {
        setError("Artiste non trouvé");
        setLoading(false);
        return;
      }

      const artistID = artistData.artists.items[0].id;

      // Get Artist Albums
      const albumsResponse = await fetch(
        "https://api.spotify.com/v1/artists/" +
          artistID +
          "/albums?include_groups=album&market=US&limit=50",
        artistParams
      );
      
      if (!albumsResponse.ok) {
        throw new Error(`Erreur API: ${albumsResponse.status}`);
      }
      
      const albumsData = await albumsResponse.json();
      setAlbums(albumsData.items || []);
    } catch (err) {
      console.error("Erreur recherche:", err);
      setError(err.message || "Erreur lors de la recherche");
    } finally {
      setLoading(false);
    }
  }

  function clearSearch() {
    setSearchInput("");
    setAlbums([]);
    setError("");
    setHasSearched(false);
  }

  // Afficher l'erreur de configuration en premier
  if (configError) {
    return (
      <div className="app-container">
        <div className="search-header">
          <Container>
            <div className="hero-section">
              <h1 className="hero-title">
                <span className="hero-spotify">Spotify</span> Album Explorer
              </h1>
            </div>
          </Container>
        </div>
        <Container className="albums-container">
          <div className="error-message">
            <h3>Configuration requise</h3>
            <p>{configError}</p>
            <p className="config-help">
              Pour résoudre ce problème :
              <br />
              1. Vérifiez que les variables VITE_CLIENT_ID et VITE_CLIENT_SECRET sont définies
              <br />
              2. Redéployez l'application
            </p>
          </div>
        </Container>
      </div>
    );
  }

  return (
    <div className="app-container">
      {/* Header avec recherche */}
      <div className="search-header">
        <Container>
          <div className="hero-section">
            <h1 className="hero-title">
              <span className="hero-spotify">Spotify</span> Album Explorer
            </h1>
            <p className="hero-subtitle">
              Découvrez la discographie complète de vos artistes préférés
            </p>
          </div>
          
          <div className="search-container">
            <div className="search-input-group">
              <FormControl
                className="search-input"
                placeholder="Entrez le nom d'un artiste (ex: Daft Punk, Taylor Swift...)"
                type="text"
                value={searchInput}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    search();
                  }
                }}
                onChange={(event) => setSearchInput(event.target.value)}
              />
              <div className="button-group">
                {hasSearched && (
                  <Button 
                    className="clear-btn" 
                    onClick={clearSearch}
                    disabled={loading}
                  >
                    Effacer
                  </Button>
                )}
                <Button 
                  className="search-btn" 
                  onClick={search} 
                  disabled={loading || !searchInput.trim()}
                >
                  {loading ? (
                    <>
                      <span className="spinner"></span>
                      Recherche... 
                    </>
                  ) : (
                    "Explorer"
                  )}
                </Button>
              </div>
            </div>
            
            {/* Suggestions d'artistes */}
            {!hasSearched && albums.length === 0 && !error && (
              <div className="suggestions">
                <p className="suggestions-title">Artistes populaires :</p>
                <div className="suggestions-tags">
                  {["Kendrick Lamar", "Beyoncé", "The Weeknd", "Ariana Grande", "Drake"].map((artist) => (
                    <button
                      key={artist}
                      className="suggestion-tag"
                      onClick={() => {
                        setSearchInput(artist);
                        setTimeout(() => search(), 100);
                      }}
                    >
                      {artist}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </Container>
      </div>

      {/* Contenu principal */}
      <Container className="albums-container">
        {error && (
          <div className="error-message">
            <div className="error-icon">
              {error.includes("configurée")}
            </div>
            <h3>{error}</h3>
            <p>
              {error.includes("configurée") 
                ? "L'application nécessite une configuration pour fonctionner" 
                : "Vérifiez l'orthographe ou essayez un autre artiste"
              }
            </p>
            <Button className="retry-btn" onClick={clearSearch}>
              Nouvelle recherche
            </Button>
          </div>
        )}

        {loading && (
          <div className="loading-state">
            <div className="loading-spinner"></div>
            <h3>Exploration en cours...</h3>
            <p>Recherche des albums de {searchInput}</p>
          </div>
        )}

        {!loading && !hasSearched && albums.length === 0 && !error && (
          <div className="empty-state">
            <h2>Bienvenue sur Spotify Album Explorer</h2>
            <p className="empty-state-description">
              Explorez la discographie complète de millions d'artistes. 
              Trouvez leurs albums, dates de sortie et écoutez directement sur Spotify.
            </p>
            <div className="features">
              <div className="feature">
                <h4>Recherche intuitive</h4>
                <p>Trouvez rapidement vos artistes préférés</p>
              </div>
              <div className="feature">
                <h4>Discographie complète</h4>
                <p>Accédez à tous les albums officiels</p>
              </div>
              <div className="feature">
                <h4>Écoute instantanée</h4>
                <p>Lancez la lecture directement sur Spotify</p>
              </div>
            </div>
          </div>
        )}

        {!loading && hasSearched && albums.length === 0 && !error && (
          <div className="empty-state">
            <h3>Prêt à explorer ?</h3>
            <p>Commencez par rechercher un artiste ci-dessus</p>
          </div>
        )}

        {albums.length > 0 && (
          <>
            <div className="results-header">
              <h2 className="results-title">
                Albums de <span className="artist-name">{searchInput}</span>
                <span className="results-count"> ({albums.length} album{albums.length > 1 ? 's' : ''})</span>
              </h2>
              <Button className="back-btn" onClick={clearSearch}>
                ← Nouvelle recherche
              </Button>
            </div>
            
            <div className="albums-grid">
              {albums.map((album, index) => (
                <Card key={album.id} className="album-card">
                  <div className="album-image-container">
                    <Card.Img
                      className="album-image"
                      src={album.images[0]?.url}
                      alt={album.name}
                    />
                    <div className="album-overlay">
                      <span className="play-icon">▶</span>
                    </div>
                  </div>
                  <Card.Body className="album-content">
                    <Card.Title className="album-title">
                      {album.name}
                    </Card.Title>
                    <Card.Text className="album-release-date">
                      Sorti le {new Date(album.release_date).toLocaleDateString('fr-FR')}
                    </Card.Text>
                    <div className="album-actions">
                      <Button
                        className="album-link-btn"
                        href={album.external_urls.spotify}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        Écouter sur Spotify
                      </Button>
                    </div>
                  </Card.Body>
                </Card>
              ))}
            </div>
          </>
        )}
      </Container>

      {/* Footer */}
      <footer className="app-footer">
        <Container>
          <p>
            Propulsé par l'API Spotify • 
            <span> Découvrez la musique autrement</span>
          </p>
        </Container>
      </footer>
    </div>
  );
}

export default App;