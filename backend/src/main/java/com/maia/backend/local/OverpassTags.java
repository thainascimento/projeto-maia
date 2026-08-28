package com.maia.backend.local;

import com.fasterxml.jackson.annotation.JsonProperty;

public class OverpassTags {

    public String name;

    public String amenity;
    public String tourism;
    public String shop;

    @JsonProperty("addr:housenumber")
    public String addr_housenumber;

    @JsonProperty("addr:street")
    public String addr_street;

    @JsonProperty("addr:suburb")
    public String addr_suburb;

    @JsonProperty("addr:city")
    public String addr_city;

    @JsonProperty("addr:state")
    public String addr_state;

    @JsonProperty("addr:postcode")
    public String addr_postcode;
}