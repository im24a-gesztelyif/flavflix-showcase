export const PRIMARY_NAV_ITEMS = [
  { href: "/", label: "Home" },
  { href: "/movies", label: "Movies" },
  { href: "/tv", label: "TV Shows" },
  { href: "/search", label: "Search" },
  { href: "/random", label: "Random" },
];

export const USER_MENU_ITEMS = [
  { href: "/my-list", label: "My List" },
  { href: "/continue-watching", label: "Continue Watching" },
  { href: "/history", label: "History" },
  { href: "/settings", label: "Settings" },
];

export const HOME_RAILS = [
  {
    key: "trending-mixed",
    title: "Top 10",
    path: "trending/all/week",
  },
  {
    key: "trending-movies",
    title: "Trending Movies",
    path: "trending/movie/week",
  },
  {
    key: "trending-series",
    title: "Trending Series",
    path: "trending/tv/week",
    mediaType: "tv",
  },
  {
    key: "upcoming-releases",
    title: "Upcoming Releases",
    path: "movie/upcoming",
  },
  {
    key: "top-rated-movies",
    title: "Top Rated Movies",
    path: "movie/top_rated",
  },
  {
    key: "top-rated-series",
    title: "Top Rated Series",
    path: "tv/top_rated",
    mediaType: "tv",
  },
  {
    key: "action",
    title: "Action",
    path: "discover/movie",
    params: {
      sort_by: "popularity.desc",
      with_genres: "28",
      "vote_count.gte": 200,
    },
  },
  {
    key: "romance",
    title: "Romance",
    path: "discover/movie",
    params: {
      sort_by: "popularity.desc",
      with_genres: "10749",
      "vote_count.gte": 120,
    },
  },
  {
    key: "horror",
    title: "Horror",
    path: "discover/movie",
    params: {
      sort_by: "popularity.desc",
      with_genres: "27",
      "vote_count.gte": 100,
    },
  },
  {
    key: "comedy",
    title: "Comedy",
    path: "discover/movie",
    params: {
      sort_by: "popularity.desc",
      with_genres: "35",
      "vote_count.gte": 120,
    },
  },
  {
    key: "animation",
    title: "Animation",
    path: "discover/movie",
    params: {
      sort_by: "popularity.desc",
      with_genres: "16",
      "vote_count.gte": 100,
    },
  },
  {
    key: "crime",
    title: "Crime",
    path: "discover/tv",
    params: {
      sort_by: "popularity.desc",
      with_genres: "80",
      "vote_count.gte": 120,
    },
    mediaType: "tv",
  },
  {
    key: "sci-fi",
    title: "Sci-Fi",
    path: "discover/movie",
    params: {
      sort_by: "popularity.desc",
      with_genres: "878",
      "vote_count.gte": 120,
    },
  },
  {
    key: "drama",
    title: "Drama",
    path: "discover/tv",
    params: {
      sort_by: "popularity.desc",
      with_genres: "18",
      "vote_count.gte": 120,
    },
    mediaType: "tv",
  },
  {
    key: "thriller",
    title: "Thriller",
    path: "discover/movie",
    params: {
      sort_by: "popularity.desc",
      with_genres: "53",
      "vote_count.gte": 120,
    },
  },
  {
    key: "family",
    title: "Family",
    path: "discover/movie",
    params: {
      sort_by: "popularity.desc",
      with_genres: "10751",
      "vote_count.gte": 80,
    },
  },
  {
    key: "documentary",
    title: "Documentary",
    path: "discover/movie",
    params: {
      sort_by: "popularity.desc",
      with_genres: "99",
      "vote_count.gte": 40,
    },
  },
  {
    key: "fantasy",
    title: "Fantasy",
    path: "discover/movie",
    params: {
      sort_by: "popularity.desc",
      with_genres: "14",
      "vote_count.gte": 80,
    },
  },
];

export const MOVIE_SORT_OPTIONS = [
  { value: "popularity.desc", label: "Most Popular" },
  { value: "vote_average.desc", label: "Highest Rated" },
  { value: "primary_release_date.desc", label: "Newest Release" },
  { value: "primary_release_date.asc", label: "Oldest Release" },
  { value: "revenue.desc", label: "Biggest Box Office" },
];

export const TV_SORT_OPTIONS = [
  { value: "popularity.desc", label: "Most Popular" },
  { value: "vote_average.desc", label: "Highest Rated" },
  { value: "first_air_date.desc", label: "Newest Premiere" },
  { value: "first_air_date.asc", label: "Oldest Premiere" },
];
