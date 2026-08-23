from typing import Any, Dict, List, Optional
from fastapi import APIRouter, Query, status

from app.schemas.common import APIResponse
from app.services.live_search_service import LiveSearchService

router = APIRouter(prefix="/places", tags=["Live Food & Stays Recommendations"])


@router.get(
    "/live-food",
    response_model=APIResponse[List[Dict[str, Any]]],
    status_code=status.HTTP_200_OK,
    summary="Live DuckDuckGo authentic food & restaurant recommendations",
)
async def get_live_food_recommendations(
    city: str = Query(..., description="Destination city name (e.g. Udaipur, Goa, Manali)"),
    budget_tier: Optional[str] = Query("mid", description="budget, mid, luxury"),
):
    """
    Queries live DuckDuckGo and curated databases for famous local food spots,
    traditional thalis, iconic street food, and cafes with real INR pricing.
    """
    results = await LiveSearchService.get_food_recommendations(city=city, budget_tier=budget_tier)
    return APIResponse(
        success=True,
        data=results,
        message=f"Live food recommendations for {city} retrieved successfully",
    )


@router.get(
    "/live-stays",
    response_model=APIResponse[List[Dict[str, Any]]],
    status_code=status.HTTP_200_OK,
    summary="Live DuckDuckGo stay & hotel recommendations",
)
async def get_live_stay_recommendations(
    city: str = Query(..., description="Destination city name (e.g. Udaipur, Goa, Manali)"),
    budget_tier: Optional[str] = Query("mid", description="budget, mid, luxury"),
):
    """
    Queries live DuckDuckGo and curated databases for top-rated hotels, hostels (Zostel/Hosteller),
    homestays, and luxury heritage palace resorts with real INR pricing.
    """
    results = await LiveSearchService.get_stay_recommendations(city=city, budget_tier=budget_tier)
    return APIResponse(
        success=True,
        data=results,
        message=f"Live stay recommendations for {city} retrieved successfully",
    )


@router.get(
    "/curated",
    response_model=APIResponse[List[Dict[str, Any]]],
    status_code=status.HTTP_200_OK,
    summary="Curated tourism attractions and POIs from Audiala 33K+ open dataset",
)
async def get_curated_places(
    city: str = Query(..., description="Destination city name (e.g. Mumbai, Jaipur, Paris)"),
    category: Optional[str] = Query(None, description="Optional category filter (e.g. museum, palace, temple, tower)"),
    limit: Optional[int] = Query(20, ge=1, le=100, description="Max results to return"),
):
    """
    Returns curated, verified tourist places and landmarks with exact coordinates,
    fame rankings, and editorial audio guide links.
    """
    from app.services.audiala_places_service import AudialaPlacesService
    places = AudialaPlacesService.get_places_for_city(city_name=city, limit=limit, category=category)
    return APIResponse(
        success=True,
        data=places,
        message=f"Curated tourism places for {city} retrieved successfully (Attribution: Audiala CC BY 4.0)",
    )


@router.get(
    "/search",
    response_model=APIResponse[List[Dict[str, Any]]],
    status_code=status.HTTP_200_OK,
    summary="Search tourism places across 33,148 POIs",
)
async def search_tourism_places(
    q: str = Query(..., description="Search query keyword (e.g. Taj Mahal, Colosseum, Amber Fort)"),
    limit: Optional[int] = Query(15, ge=1, le=50),
):
    """
    Searches worldwide tourism attractions by landmark name or city.
    """
    from app.services.audiala_places_service import AudialaPlacesService
    results = AudialaPlacesService.search_places(query=q, limit=limit)
    return APIResponse(
        success=True,
        data=results,
        message=f"Found {len(results)} matches for '{q}'",
    )


@router.get(
    "/dataset-stats",
    response_model=APIResponse[Dict[str, Any]],
    status_code=status.HTTP_200_OK,
    summary="Metadata stats of the installed 33K+ tourism places open dataset",
)
async def get_tourism_dataset_stats():
    """
    Returns metadata statistics for the loaded open dataset.
    """
    from app.services.audiala_places_service import AudialaPlacesService
    stats = AudialaPlacesService.get_stats()
    return APIResponse(
        success=True,
        data=stats,
        message="Audiala open tourism dataset stats retrieved successfully",
    )
