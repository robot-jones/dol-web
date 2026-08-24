import { Show } from "@erikmuir/dol-lib/types";
import { getStateName } from "@erikmuir/dol-lib/dapp";
import { ShowsVenueDict } from "@/hooks/use-shows";
import { NoShowsFound } from "@/components/common/NoShowsFound";
import {
  CityVenues,
  CountryStates,
  LocationShowCount,
  LocationType,
  StateCities,
  VenueShows,
} from "./types";
import { Location } from "./Location";
import { ShowsForVenue } from "@/components/views/HelpingFriendlyBook/Locations/ShowsForVenue";

export class ViewModel {
  private currentCountry?: string;
  private currentState?: string;
  private currentCity?: string;
  private currentVenue?: string;
  private currentLocation: string;
  private listItemType: LocationType;
  private countryStates: CountryStates;
  private stateCities: StateCities;
  private cityVenues: CityVenues;
  private venueShows: VenueShows;
  private shows: Show[];
  private listItems: LocationShowCount[];
  private jumpTo: (name: string, value: string) => void;

  public component: React.ReactElement;

  constructor(
    showsByVenue: ShowsVenueDict,
    jumpTo: (name: string, value: string) => void,
    currentCountry?: string,
    currentState?: string,
    currentCity?: string,
    currentVenue?: string
  ) {
    this.currentCountry = currentCountry;
    this.currentState = currentState;
    this.currentCity = currentCity;
    this.currentVenue = currentVenue;
    this.currentLocation =
      currentVenue || currentCity || currentState || currentCountry || "Earth";
    this.listItemType = currentCity
      ? "venue"
      : currentState || (currentCountry && currentCountry !== "USA")
      ? "city"
      : currentCountry
      ? "state"
      : "country";
    this.jumpTo = jumpTo;
    this.countryStates = this.mapCountryStates(showsByVenue);
    this.stateCities = this.countryStates[currentCountry ?? ""] ?? {};
    // Non-USA countries skip the state/province level in the UI (see
    // listItemType above), but shows are still filed under their real
    // state/province in stateCities — merge across all of them to get every
    // city in the country rather than looking up a single (nonexistent) key.
    this.cityVenues = currentState
      ? this.stateCities[currentState] ?? {}
      : this.mergeCityVenues(this.stateCities);
    this.venueShows = this.cityVenues[currentCity ?? ""] ?? {};
    this.shows = this.venueShows[currentVenue ?? ""] ?? [];
    this.shows.sort(this.showsByDate);
    this.listItems = currentVenue
      ? []
      : this.currentCity
      ? this.getTargetsForCity()
      : this.currentState
      ? this.getTargetsForState()
      : this.currentCountry
      ? this.getTargetsForCountry()
      : this.getTargetsForEarth();
    this.component = this.getCurrentLocation();
  }

  private getCurrentLocation = (): React.ReactElement => {
    const noShowsFound = this.currentVenue
      ? this.shows.length === 0
      : this.listItems.length === 0;
    const content: React.ReactElement = noShowsFound ? (
      <NoShowsFound header={this.currentLocation} />
    ) : this.currentVenue ? (
      <ShowsForVenue header={this.currentLocation} shows={this.shows} />
    ) : (
      <Location
        name={this.currentLocation}
        locationType={this.listItemType}
        targets={this.listItems}
        jumpTo={this.jumpTo}
      />
    );
    return content;
  };

  private mapCountryStates = (showsByVenue: ShowsVenueDict): CountryStates => {
    const countryStates: CountryStates = {};
    for (const venue of Object.keys(showsByVenue)) {
      const firstShow = showsByVenue[venue][0];
      const { city, state, country } = firstShow;
      const stateName = getStateName(state) ?? "";
      if (!countryStates[country]) countryStates[country] = {};
      if (!countryStates[country][stateName])
        countryStates[country][stateName] = {};
      if (!countryStates[country][stateName][city])
        countryStates[country][stateName][city] = {};
      countryStates[country][stateName][city][venue] = showsByVenue[venue];
    }
    return countryStates;
  };

  private mergeCityVenues = (stateCities: StateCities): CityVenues => {
    const merged: CityVenues = {};
    for (const state of Object.keys(stateCities)) {
      for (const city of Object.keys(stateCities[state])) {
        merged[city] = { ...merged[city], ...stateCities[state][city] };
      }
    }
    return merged;
  };

  private getShowCountByVenue = (
    country: string = "",
    state: string = "",
    city: string = "",
    venue: string
  ): number => {
    return this.countryStates[country][state][city][venue].length;
  };

  private getShowCountByCity = (
    country: string = "",
    state: string = "",
    city: string
  ): number =>
    Object.keys(this.countryStates[country][state][city])
      .map((venue) => this.getShowCountByVenue(country, state, city, venue))
      .reduce((acc, val) => acc + val, 0);

  // Counts directly from the already-resolved this.cityVenues, so it works
  // whether that came from a single state (USA) or a merge across states
  // (non-USA — see mergeCityVenues).
  private getShowCountForCity = (city: string): number =>
    Object.keys(this.cityVenues[city])
      .map((venue) => this.cityVenues[city][venue].length)
      .reduce((acc, val) => acc + val, 0);

  private getShowCountByState = (country: string = "", state: string): number =>
    Object.keys(this.countryStates[country][state])
      .map((city) => this.getShowCountByCity(country, state, city))
      .reduce((acc, val) => acc + val, 0);

  private getShowCountByCountry = (country: string): number =>
    Object.keys(this.countryStates[country])
      .map((state) => this.getShowCountByState(country, state))
      .reduce((acc, val) => acc + val, 0);

  private getTargetsForEarth = (): LocationShowCount[] => {
    const targets: LocationShowCount[] = Object.keys(this.countryStates).map(
      (x) => [x, this.getShowCountByCountry(x)]
    );
    targets.sort(this.locationsByShowCount);
    return targets;
  };

  private getTargetsForCountry = (): LocationShowCount[] => {
    const targets: LocationShowCount[] =
      this.currentCountry === "USA"
        ? Object.keys(this.stateCities).map((state) => [
            state,
            this.getShowCountByState(this.currentCountry, state),
          ])
        : Object.keys(this.cityVenues).map((city) => [
            city,
            this.getShowCountForCity(city),
          ]);
    targets.sort(this.locationsByName);
    return targets;
  };

  private getTargetsForState = (): LocationShowCount[] => {
    const targets: LocationShowCount[] = Object.keys(this.cityVenues).map(
      (city) => [
        city,
        this.getShowCountByCity(this.currentCountry, this.currentState, city),
      ]
    );
    targets.sort(this.locationsByName);
    return targets;
  };

  private getTargetsForCity = (): LocationShowCount[] => {
    // this.venueShows is already resolved for the current city, so no need
    // to re-traverse countryStates by (country, state, city) — which would
    // fail for non-USA countries, where currentState is never set.
    const targets: LocationShowCount[] = Object.keys(this.venueShows).map(
      (venue) => [venue, this.venueShows[venue].length]
    );
    targets.sort(this.locationsByName);
    return targets;
  };

  private locationsByShowCount = (
    a: LocationShowCount,
    b: LocationShowCount
  ): number => {
    if (a[1] > b[1]) return -1;
    if (a[1] < b[1]) return 1;
    return 0;
  };

  private locationsByName = (
    a: LocationShowCount,
    b: LocationShowCount
  ): number => {
    if (a[0] > b[0]) return 1;
    if (a[0] < b[0]) return -1;
    return 0;
  };

  private showsByDate = (a: Show, b: Show): number => {
    if (a.showDate > b.showDate) return 1;
    if (a.showDate < b.showDate) return -1;
    return 0;
  };
}
